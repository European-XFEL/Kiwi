/**
 * Core type definitions for all scene elements in the Karabo → Kiwi scene model.
 * Everything here is shape/layout/widget *data only* (no React, no runtime).
 * Naming convention: every public interface ends with “Props”.
 */

/* ──────────────────────────────────────────────────────────────────────────
 * Layout-data (how a child is positioned inside a specific layout)
 * ────────────────────────────────────────────────────────────────────────── */

export interface BaseLayoutDataProps {}

export interface FixedLayoutChildProps extends BaseLayoutDataProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GridLayoutChildProps extends BaseLayoutDataProps {
  row: number;
  col: number;
  rowspan: number;
  colspan: number;
}

/** Union of all per-layout child data payloads */
export type ChildLayoutDataProps = FixedLayoutChildProps | GridLayoutChildProps;

/* ──────────────────────────────────────────────────────────────────────────
 * Scene object base (common to layouts, widgets, shapes)
 * ────────────────────────────────────────────────────────────────────────── */

export interface BaseSceneObjectProps {
  /**
   * Child layout positioning data set by the *parent layout*.
   * - FixedLayout → FixedLayoutChildProps
   * - GridLayout  → GridLayoutChildProps
   * - BoxLayout   → none (auto flow)
   */
  layout_data?: ChildLayoutDataProps;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Controller kinds for widgets
 * ────────────────────────────────────────────────────────────────────────── */

export type BaseControllerKind =
  | "DisplayComponent"
  | "EditableApplyLaterComponent";

/* ──────────────────────────────────────────────────────────────────────────
 * Widget base
 * ────────────────────────────────────────────────────────────────────────── */

export interface BaseWidgetProps extends BaseSceneObjectProps {
  readonly element_type: "widget";

  /** Geometry (always defined in XML for widgets) */
  x: number;
  y: number;
  width: number;
  height: number;

  /** Optional data binding (present on controller widgets) */
  keys?: string[];

  /** Optional parent component type (e.g. DisplayComponent) */
  parent_component?: BaseControllerKind;
}

/** Widgets that are explicitly editable controllers */
export interface BaseEditWidgetProps extends BaseWidgetProps {
  parent_component: "EditableApplyLaterComponent";
}

/** Widgets that can be display or editable controllers */
export interface BaseDisplayEditableWidgetProps extends BaseWidgetProps {
  parent_component: BaseControllerKind;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Shape base (pure SVG primitives)
 * ────────────────────────────────────────────────────────────────────────── */

export interface BaseShapeProps extends BaseSceneObjectProps {
  readonly element_type: "shape";

  // Stroke
  stroke: string;
  stroke_opacity: number;
  stroke_linecap: "butt" | "square" | "round";
  stroke_dashoffset: number;
  stroke_width: number;
  stroke_dasharray: number[];
  stroke_style: number; // Qt pen style (1=solid)
  stroke_linejoin: "miter" | "round" | "bevel";
  stroke_miterlimit: number;

  // Fill
  fill: string;
  fill_opacity: number;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Layout base (containers with children)
 * ────────────────────────────────────────────────────────────────────────── */

export interface BaseLayoutProps extends BaseSceneObjectProps {
  readonly element_type: "layout";

  /** Geometry of the layout container itself */
  x: number;
  y: number;
  width: number;
  height: number;

  /** Child elements (layouts, widgets, shapes) */
  children: BaseSceneObjectProps[];
}
