/**
 * -----------------------------------------------------------------------------
 * Defines the intermediate representation (IR) emitted by the parser.
 * This IR is consumed by the builder/registry system to instantiate models.
 */

// -----------------------------------------------------------------------------
// Base Union
// -----------------------------------------------------------------------------

export type IRSceneChild = IRLayout | IRWidget | IRShape;

// -----------------------------------------------------------------------------
// Layouts
// -----------------------------------------------------------------------------

export interface IRLayout {
  element_type: "layout";
  layout_type: "BoxLayout" | "FixedLayout" | "GridLayout";
  x: number;
  y: number;
  width: number;
  height: number;
  /** BoxLayout only: direction enum (0=LeftToRight, 1=RightToLeft, etc.) */
  direction?: 0 | 1 | 2 | 3;
  children: IRSceneChild[];
}

// -----------------------------------------------------------------------------
// Widgets
// -----------------------------------------------------------------------------

export interface IRWidget {
  element_type: "widget";
  widget_type: string; // e.g. "Label", "DisplayCheckBox"
  parent_component?: "DisplayComponent" | "EditableApplyLaterComponent";
  x: number;
  y: number;
  width: number;
  height: number;
  keys?: string[];

  /** Arbitrary attributes (trend graph, icon_name, show_string, etc.) */
  [key: string]: any;
}

// -----------------------------------------------------------------------------
// Shapes
// -----------------------------------------------------------------------------

export type IRShape =
  | {
      element_type: "shape";
      shape_type: "Line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke: string;
      stroke_width: number;
      stroke_opacity: number;
    }
  | {
      element_type: "shape";
      shape_type: "Polygon";
      points: string;
      stroke: string;
      fill: string;
      stroke_width: number;
      stroke_opacity: number;
      fill_opacity: number;
    }
  | {
      element_type: "shape";
      shape_type: "Rectangle";
      x: number;
      y: number;
      width: number;
      height: number;
      stroke: string;
      fill: string;
      stroke_width: number;
      stroke_opacity: number;
    }
  | {
      element_type: "shape";
      shape_type: "ArrowPolygon";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      hx1: number;
      hy1: number;
      hx2: number;
      hy2: number;
      stroke: string;
      fill: string;
      stroke_width: number;
      stroke_opacity: number;
      fill_opacity: number;
    };
