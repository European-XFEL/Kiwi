/**
 * Shape prop definitions for SVG primitives.
 * All shapes extend BaseShapeProps and represent drawable scene elements.
 */
import { BaseShapeProps } from './base';

/* ──────────────────────────────────────────────────────────────────────────
 * Line
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Straight line defined by two endpoints.
 *
 * Example:
 * <svg:line x1="10" y1="20" x2="100" y2="80"
 *           stroke="#ff0000" stroke-width="2" />
 */
export interface LineProps extends BaseShapeProps {
  shape_type: 'Line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Rectangle
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Rectangle defined by top-left corner and dimensions.
 *
 * Example:
 * <svg:rect x="10" y="20" width="100" height="50"
 *           fill="#cccccc" stroke="#000000" stroke-width="1" />
 */
export interface RectangleProps extends BaseShapeProps {
  shape_type: 'Rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

/* ──────────────────────────────────────────────────────────────────────────
 * ArrowPolygon
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Arrow consisting of a line shaft and polygon arrowhead.
 *
 * Example:
 * <svg:g>
 *   <svg:line x1="10" y1="20" x2="100" y2="80" />
 *   <svg:polygon points="100,80 95,75 95,85" />
 * </svg:g>
 */
export interface ArrowPolygonProps extends BaseShapeProps {
  shape_type: 'ArrowPolygon';

  /** Line coordinates */
  x1: number;
  y1: number;
  x2: number;
  y2: number;

  /** Arrowhead vertices */
  hx1: number;
  hy1: number;
  hx2: number;
  hy2: number;

  /** Computed bounding box */
  width: number;
  height: number;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Polygon
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Polygon defined by a list of vertex coordinates.
 * Commonly used for arrowheads or filled shapes.
 *
 * Example:
 * <svg:polygon points="10,20 100,20 55,80"
 *              fill="#0000ff" stroke="#000000" stroke-width="1" />
 */
export interface PolygonProps extends BaseShapeProps {
  shape_type: 'Polygon';

  /** SVG-style points string: "x1,y1 x2,y2 x3,y3" */
  points: string;

  /** Computed bounding box */
  x: number;
  y: number;
  width: number;
  height: number;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Path
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Arbitrary SVG path element.
 *
 * Example:
 * <svg:path d="M10 20 L100 80 Q150 100 200 80"
 *           stroke="#000000" fill="none" />
 */
export interface PathProps extends BaseShapeProps {
  shape_type: 'Path';

  /** SVG path data string (e.g. "M10 20 L100 80 Q150 100 200 80") */
  svg_data: string;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Union Type
 * ────────────────────────────────────────────────────────────────────────── */

/** All supported shape prop types. */
export type ShapeProps =
  | LineProps
  | RectangleProps
  | ArrowPolygonProps
  | PolygonProps
  | PathProps;
