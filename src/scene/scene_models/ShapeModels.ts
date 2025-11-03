/**
 *
 * Shape model classes (Line, Rectangle, ArrowPolygon, Polygon, Path).
 * Each extends BaseShapeElementModel and provides a typed `props` getter.
 */

import { BaseShapeElementModel } from "./BaseModels";
import type {
  LineProps,
  RectangleProps,
  ArrowPolygonProps,
  PolygonProps,
  PathProps,
} from "../scene_types/shapes";

// ============================================================================
// Line
// ============================================================================

/** LineModel — represents a simple line between two points. */
export class LineModel extends BaseShapeElementModel<LineProps> {
  x1 = 0;
  y1 = 0;
  x2 = 0;
  y2 = 0;

  // --- Computed bounding box ---
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

  get props(): LineProps {
    return {
      element_type: "shape",
      shape_type: "Line",
      x1: this.x1,
      y1: this.y1,
      x2: this.x2,
      y2: this.y2,
      stroke: this.stroke,
      stroke_opacity: this.stroke_opacity,
      stroke_linecap: this.stroke_linecap,
      stroke_dashoffset: this.stroke_dashoffset,
      stroke_width: this.stroke_width,
      stroke_dasharray: this.stroke_dasharray,
      stroke_style: this.stroke_style,
      stroke_linejoin: this.stroke_linejoin,
      stroke_miterlimit: this.stroke_miterlimit,
      fill: this.fill,
      fill_opacity: this.fill_opacity,
      layout_data: this.layout_data,
    };
  }
}

// ============================================================================
// Rectangle
// ============================================================================

/** RectangleModel — represents a rectangular shape. */
export class RectangleModel extends BaseShapeElementModel<RectangleProps> {
  x = 0;
  y = 0;
  width = 0;
  height = 0;

  get props(): RectangleProps {
    return {
      element_type: "shape",
      shape_type: "Rectangle",
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      stroke: this.stroke,
      stroke_opacity: this.stroke_opacity,
      stroke_linecap: this.stroke_linecap,
      stroke_dashoffset: this.stroke_dashoffset,
      stroke_width: this.stroke_width,
      stroke_dasharray: this.stroke_dasharray,
      stroke_style: this.stroke_style,
      stroke_linejoin: this.stroke_linejoin,
      stroke_miterlimit: this.stroke_miterlimit,
      fill: this.fill,
      fill_opacity: this.fill_opacity,
      layout_data: this.layout_data,
    };
  }
}

// ============================================================================
// Polygon
// ============================================================================

/** PolygonModel — represents a polygon defined by vertex coordinates. */
export class PolygonModel extends BaseShapeElementModel<PolygonProps> {
  points = "";

  // --- Helpers ---
  #parsePoints(): Array<{ x: number; y: number }> {
    if (!this.points) return [];
    return this.points
      .trim()
      .split(/\s+/)
      .map((pair) => {
        const [x, y] = pair.split(",").map(Number);
        return { x, y };
      });
  }

  #getBounds() {
    const coords = this.#parsePoints();
    if (!coords.length) return { x: 0, y: 0, width: 0, height: 0 };

    const xs = coords.map((p) => p.x);
    const ys = coords.map((p) => p.y);
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
    return this.#getBounds().x;
  }
  get computedY() {
    return this.#getBounds().y;
  }
  get computedWidth() {
    return this.#getBounds().width;
  }
  get computedHeight() {
    return this.#getBounds().height;
  }

  get props(): PolygonProps {
    const { x, y, width, height } = this.#getBounds();
    return {
      element_type: "shape",
      shape_type: "Polygon",
      points: this.points,
      x,
      y,
      width,
      height,
      stroke: this.stroke,
      stroke_opacity: this.stroke_opacity,
      stroke_linecap: this.stroke_linecap,
      stroke_dashoffset: this.stroke_dashoffset,
      stroke_width: this.stroke_width,
      stroke_dasharray: this.stroke_dasharray,
      stroke_style: this.stroke_style,
      stroke_linejoin: this.stroke_linejoin,
      stroke_miterlimit: this.stroke_miterlimit,
      fill: this.fill,
      fill_opacity: this.fill_opacity,
      layout_data: this.layout_data,
    };
  }
}

// ============================================================================
// ArrowPolygon
// ============================================================================

/** ArrowPolygonModel — represents a line with a polygonal arrowhead. */
export class ArrowPolygonModel extends BaseShapeElementModel<ArrowPolygonProps> {
  // Line
  x1 = 0;
  y1 = 0;
  x2 = 0;
  y2 = 0;

  // Arrowhead
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

  get props(): ArrowPolygonProps {
    return {
      element_type: "shape",
      shape_type: "ArrowPolygon",
      x1: this.x1,
      y1: this.y1,
      x2: this.x2,
      y2: this.y2,
      hx1: this.hx1,
      hy1: this.hy1,
      hx2: this.hx2,
      hy2: this.hy2,
      width: this.computedWidth,
      height: this.computedHeight,
      stroke: this.stroke,
      stroke_opacity: this.stroke_opacity,
      stroke_linecap: this.stroke_linecap,
      stroke_dashoffset: this.stroke_dashoffset,
      stroke_width: this.stroke_width,
      stroke_dasharray: this.stroke_dasharray,
      stroke_style: this.stroke_style,
      stroke_linejoin: this.stroke_linejoin,
      stroke_miterlimit: this.stroke_miterlimit,
      fill: this.fill,
      fill_opacity: this.fill_opacity,
      layout_data: this.layout_data,
    };
  }
}

// ============================================================================
// Path
// ============================================================================

/** PathModel — represents an arbitrary SVG path. */
export class PathModel extends BaseShapeElementModel<PathProps> {
  svg_data = "";

  get props(): PathProps {
    return {
      element_type: "shape",
      shape_type: "Path",
      svg_data: this.svg_data,
      stroke: this.stroke,
      stroke_opacity: this.stroke_opacity,
      stroke_linecap: this.stroke_linecap,
      stroke_dashoffset: this.stroke_dashoffset,
      stroke_width: this.stroke_width,
      stroke_dasharray: this.stroke_dasharray,
      stroke_style: this.stroke_style,
      stroke_linejoin: this.stroke_linejoin,
      stroke_miterlimit: this.stroke_miterlimit,
      fill: this.fill,
      fill_opacity: this.fill_opacity,
      layout_data: this.layout_data,
    };
  }
}
