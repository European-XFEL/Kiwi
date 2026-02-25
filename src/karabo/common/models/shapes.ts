/**
 * Shape models — Line, Rectangle, Polygon, ArrowPolygon, Path.
 *
 * Purely visual, no data bindings. All extend BaseShapeObjectData.
 */

import { BaseShapeObjectData } from './bases';

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

// Rectangle
// ----------------------------------------------------------------------------

/** Rectangular shape with position and dimensions. */
export class RectangleModel extends BaseShapeObjectData {
  x = 0;
  y = 0;
  width = 0;
  height = 0;
}

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

// ArrowPolygon
// ----------------------------------------------------------------------------

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

// Path
// ----------------------------------------------------------------------------

/** Arbitrary SVG path defined by svg_data string. */
export class PathModel extends BaseShapeObjectData {
  svg_data = '';
}
