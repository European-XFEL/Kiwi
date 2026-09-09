/**
 * Shape models — Line, Rectangle, Polygon, ArrowPolygon, Path, Defs.
 *
 * Purely visual, no data bindings. Every shape extends BaseShapeObjectData;
 * Defs is the exception — it paints nothing and only carries definitions.
 */

import { BaseSceneObjectData, BaseShapeObjectData } from './bases';

import { registerReader } from './Registry';
import {
  SVG_DEFS,
  SVG_LINE,
  SVG_PATH,
  SVG_POLYGON,
  SVG_RECT,
} from './constants';
import {
  xmlAttr,
  attributesToRecord,
  childElements,
  readBaseShapeData,
  toNum,
  toStr,
} from './util';

// Line
// ----------------------------------------------------------------------------

/** Two-point line segment. */
export class LineModel extends BaseShapeObjectData {
  x1 = 0;
  y1 = 0;
  x2 = 0;
  y2 = 0;

  get computedX() {
    return Math.min(this.x1, this.x2);
  }

  get computedY() {
    return Math.min(this.y1, this.y2);
  }

  get computedWidth() {
    return Math.abs(this.x2 - this.x1);
  }

  get computedHeight() {
    return Math.abs(this.y2 - this.y1);
  }

  getBoundingBox() {
    return {
      x: this.computedX,
      y: this.computedY,
      width: this.computedWidth,
      height: this.computedHeight,
    };
  }
}

registerReader(
  'Line',
  (element) => {
    const line = new LineModel();

    line.x1 = toNum(xmlAttr(element, 'x1'));
    line.y1 = toNum(xmlAttr(element, 'y1'));
    line.x2 = toNum(xmlAttr(element, 'x2'));
    line.y2 = toNum(xmlAttr(element, 'y2'));
    readBaseShapeData(element, line);

    return line;
  },
  SVG_LINE
);

// Rectangle
// ----------------------------------------------------------------------------

/** Rectangular shape with position and dimensions. */
export class RectangleModel extends BaseShapeObjectData {
  x = 0;
  y = 0;
  width = 0;
  height = 0;

  // A rectangle dragged right-to-left or bottom-to-top is stored with negative
  // extents. Qt normalises those when it draws (QRect::normalized), but SVG
  // treats a negative width or height as an error and skips the element, so the
  // shape would silently vanish. Normalise to the same box Qt paints, while
  // leaving x/y/width/height untouched for round-tripping.
  get computedX() {
    return this.width < 0 ? this.x + this.width : this.x;
  }

  get computedY() {
    return this.height < 0 ? this.y + this.height : this.y;
  }

  get computedWidth() {
    return Math.abs(this.width);
  }

  get computedHeight() {
    return Math.abs(this.height);
  }
}

registerReader(
  'Rectangle',
  (element) => {
    const rect = new RectangleModel();

    rect.x = toNum(xmlAttr(element, 'x'));
    rect.y = toNum(xmlAttr(element, 'y'));
    rect.width = toNum(xmlAttr(element, 'width'));
    rect.height = toNum(xmlAttr(element, 'height'));
    readBaseShapeData(element, rect);

    return rect;
  },
  SVG_RECT
);

// Polygon
// ----------------------------------------------------------------------------

/** Closed polygon defined by a points string (e.g. "10,20 30,40 50,60"). */
export class PolygonModel extends BaseShapeObjectData {
  points = '';

  private parsePoints(): Array<{ x: number; y: number }> {
    if (!this.points) return [];
    return this.points
      .trim()
      .split(/\s+/)
      .map((pair) => {
        const [x, y] = pair.split(',').map(Number);
        return { x, y };
      });
  }

  private getBounds() {
    const coords = this.parsePoints();
    if (!coords.length) return { x: 0, y: 0, width: 0, height: 0 };

    const xs = coords.map((point) => point.x);
    const ys = coords.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  get computedX() {
    return this.getBounds().x;
  }

  get computedY() {
    return this.getBounds().y;
  }

  get computedWidth() {
    return this.getBounds().width;
  }

  get computedHeight() {
    return this.getBounds().height;
  }
}

/** Arrow shape defined by two endpoints and two control/head points. */
export class ArrowPolygonModel extends BaseShapeObjectData {
  x1 = 0;
  y1 = 0;
  x2 = 0;
  y2 = 0;
  hx1 = 0;
  hy1 = 0;
  hx2 = 0;
  hy2 = 0;

  get computedX() {
    return Math.min(this.x1, this.x2, this.hx1, this.hx2);
  }

  get computedY() {
    return Math.min(this.y1, this.y2, this.hy1, this.hy2);
  }

  get computedWidth() {
    const maxX = Math.max(this.x1, this.x2, this.hx1, this.hx2);
    return Math.max(maxX - this.computedX, 10);
  }

  get computedHeight() {
    const maxY = Math.max(this.y1, this.y2, this.hy1, this.hy2);
    return Math.max(maxY - this.computedY, 10);
  }
}

registerReader('ArrowPolygonModel', (element) => {
  const arrow = new ArrowPolygonModel();

  // ArrowPolygon is a compound shape: svg:g containing svg:line + svg:polygon
  const children = childElements(element);
  const lineElement = children.find((child) => child.tagName === SVG_LINE);
  const polyElement = children.find((child) => child.tagName === SVG_POLYGON);

  // Line endpoints
  arrow.x1 = toNum(lineElement ? xmlAttr(lineElement, 'x1') : null);
  arrow.y1 = toNum(lineElement ? xmlAttr(lineElement, 'y1') : null);
  arrow.x2 = toNum(lineElement ? xmlAttr(lineElement, 'x2') : null);
  arrow.y2 = toNum(lineElement ? xmlAttr(lineElement, 'y2') : null);

  // Arrow head points from polygon "x1,y1 x2,y2 x3,y3"
  const points = toStr(polyElement ? xmlAttr(polyElement, 'points') : null)
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number));
  if (points.length >= 3) {
    arrow.hx1 = points[1][0] ?? 0;
    arrow.hy1 = points[1][1] ?? 0;
    arrow.hx2 = points[2][0] ?? 0;
    arrow.hy2 = points[2][1] ?? 0;
  }

  // Stroke/fill from the line child
  if (lineElement) readBaseShapeData(lineElement, arrow);

  return arrow;
});

/** Arbitrary SVG path defined by svg_data string. */
export class PathModel extends BaseShapeObjectData {
  svg_data = '';
}

registerReader(
  'Path',
  (element) => {
    const path = new PathModel();

    path.svg_data = toStr(xmlAttr(element, 'd'));
    readBaseShapeData(element, path);

    return path;
  },
  SVG_PATH
);

registerReader(
  'Polygon',
  (element) => {
    const polygon = new PolygonModel();

    polygon.points = toStr(xmlAttr(element, 'points'));
    readBaseShapeData(element, polygon);

    return polygon;
  },
  SVG_POLYGON
);

// Defs
// ----------------------------------------------------------------------------

/** One SVG node inside <defs>, captured verbatim so it can be re-emitted. */
export interface SvgNode {
  tag: string;
  attributes: Record<string, string>;
  children: SvgNode[];
}

/**
 * SVG <defs> block.
 *
 * Karabo writes arrowheads as <marker> definitions here and points at them
 * from a shape's marker-start/mid/end. The definitions paint nothing on their
 * own — they only need to be in the document so url(#id) resolves.
 */
export class DefsModel extends BaseSceneObjectData {
  nodes: SvgNode[] = [];
}

function readSvgNode(element: Element): SvgNode {
  return {
    tag: element.localName,
    attributes: attributesToRecord(element),
    children: childElements(element).map(readSvgNode),
  };
}

registerReader(
  'Defs',
  (element) => {
    const defs = new DefsModel();

    defs.nodes = childElements(element).map(readSvgNode);

    return defs;
  },
  SVG_DEFS
);
