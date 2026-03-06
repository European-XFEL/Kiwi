/**
 * Shape models — Line, Rectangle, Polygon, ArrowPolygon, Path.
 *
 * Purely visual, no data bindings. All extend BaseShapeObjectData.
 */

import { BaseShapeObjectData } from './bases';

import { registerReader } from '../Registry';
import { SVG_LINE, SVG_POLYGON, SVG_RECT } from '../constants';
import { readBaseShapeData, toNum, toStr } from './util';

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
  (json) => {
    const line = new LineModel();

    line.x1 = toNum(json['@_x1']);
    line.y1 = toNum(json['@_y1']);
    line.x2 = toNum(json['@_x2']);
    line.y2 = toNum(json['@_y2']);
    readBaseShapeData(json, line);

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
}

registerReader(
  'Rectangle',
  (json) => {
    const rect = new RectangleModel();

    rect.x = toNum(json['@_x']);
    rect.y = toNum(json['@_y']);
    rect.width = toNum(json['@_width']);
    rect.height = toNum(json['@_height']);
    readBaseShapeData(json, rect);

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

registerReader('ArrowPolygonModel', (json) => {
  const arrow = new ArrowPolygonModel();

  // ArrowPolygon is a compound shape: svg:g containing svg:line + svg:polygon
  const lineJson = (json[SVG_LINE] ?? {}) as Record<string, unknown>;
  const polyJson = (json[SVG_POLYGON] ?? {}) as Record<string, unknown>;

  // Line endpoints
  arrow.x1 = toNum(lineJson['@_x1']);
  arrow.y1 = toNum(lineJson['@_y1']);
  arrow.x2 = toNum(lineJson['@_x2']);
  arrow.y2 = toNum(lineJson['@_y2']);

  // Arrow head points from polygon "x1,y1 x2,y2 x3,y3"
  const points = toStr(polyJson['@_points'])
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
  readBaseShapeData(lineJson, arrow);

  return arrow;
});

/** Arbitrary SVG path defined by svg_data string. */
export class PathModel extends BaseShapeObjectData {
  svg_data = '';
}

registerReader(
  'Polygon',
  (json) => {
    const polygon = new PolygonModel();

    polygon.points = toStr(json['@_points']);
    readBaseShapeData(json, polygon);

    return polygon;
  },
  SVG_POLYGON
);
