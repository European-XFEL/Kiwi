/**
 * Display-only controller widget prop definitions (read-only, non-editable).
 * These represent UI elements bound to device properties.
 */

import { BaseControllerWidgetProps } from "../controller_base";

/* ──────────────────────────────────────────────────────────────────────────
 * Base Font Props (shared by display widgets)
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Common font attributes for text-based display widgets.
 */
export interface BaseLabelProps extends BaseControllerWidgetProps {
  parent_component: "DisplayComponent";
  font_size: number | string; // Supports numeric (px) or CSS strings ("10pt", "12px")
  font_weight: "normal" | "bold";
}

/* ──────────────────────────────────────────────────────────────────────────
 * Display Label
 * ────────────────────────────────────────────────────────────────────────── */

/** Read-only text label displaying a property value. */
export interface DisplayLabelProps extends BaseLabelProps {
  widget_type: "DisplayLabel";
  keys: string[];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Display List
 * ────────────────────────────────────────────────────────────────────────── */

/** Displays a list of values (read-only). */
export interface DisplayListProps extends BaseLabelProps {
  widget_type: "DisplayList";
  keys: string[];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Display Float
 * ────────────────────────────────────────────────────────────────────────── */

/** Displays a floating-point value with formatting options. */
export interface DisplayFloatProps extends BaseLabelProps {
  widget_type: "DisplayFloat";
  keys: string[];
  fmt: string;
  decimals: string;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Display Alarm Float
 * ────────────────────────────────────────────────────────────────────────── */

/** Displays a float value with alarm/warning thresholds. */
export interface DisplayAlarmFloatProps extends BaseLabelProps {
  widget_type: "DisplayAlarmFloat";
  keys: string[];
  fmt: string;
  decimals: string;
  alarm_high?: number;
  alarm_low?: number;
  warn_high?: number;
  warn_low?: number;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Display CheckBox
 * ────────────────────────────────────────────────────────────────────────── */

/** Read-only checkbox used as a boolean indicator. */
export interface DisplayCheckBoxProps extends BaseLabelProps {
  widget_type: "DisplayCheckBox";
}

/* ──────────────────────────────────────────────────────────────────────────
 * Display LineEdit
 * ────────────────────────────────────────────────────────────────────────── */

/** Read-only text field displaying a value. */
export interface DisplayLineEditProps extends BaseLabelProps {
  widget_type: "DisplayLineEdit";
  keys: string[];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Display Command
 * ────────────────────────────────────────────────────────────────────────── */

/** Command button widget (e.g., "Start" / "Stop"). */
export interface DisplayCommandProps extends BaseControllerWidgetProps {
  widget_type: "DisplayCommand";
  parent_component: "DisplayComponent";
  keys: string[];
  font_size: number | string;
  font_weight: "normal" | "bold";
  requires_confirmation: boolean;
  /**
   * Optional: Array of device states in which this command is allowed to execute.
   * If undefined or empty, the command is enabled regardless of device state.
   * Examples: ["ACTIVE", "ON"], ["RUNNING", "ACQUIRING"]
   */
  allowedStates?: string[];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Display State Color
 * ────────────────────────────────────────────────────────────────────────── */

/** Color indicator representing a device or process state. */
export interface DisplayStateColorProps extends BaseControllerWidgetProps {
  widget_type: "DisplayStateColor";
  parent_component: "DisplayComponent";
  keys: string[];
  font_size: number | string;
  font_weight: "normal" | "bold";
  show_string: boolean;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Display Stateful Icon
 * ────────────────────────────────────────────────────────────────────────── */

/** Icon that changes appearance based on current state. */
export interface DisplayStatefulIconProps extends BaseControllerWidgetProps {
  widget_type: "DisplayStatefulIcon";
  parent_component: "DisplayComponent";
  keys: string[];
  font_size: number | string;
  font_weight: "normal" | "bold";
  icon_name: string;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Display Trend Graph
 * ────────────────────────────────────────────────────────────────────────── */

/** Time-series chart displaying property trends over time. */
export interface DisplayTrendGraphProps extends BaseControllerWidgetProps {
  widget_type: "DisplayTrendGraph";
  parent_component: "DisplayComponent";
  keys: string[];
  font_size: number | string;
  font_weight: "normal" | "bold";

  x_label: string;
  y_label: string;
  x_units: string;
  y_units: string;

  x_grid: boolean;
  y_grid: boolean;
  x_log: boolean;
  y_log: boolean;
  x_invert: boolean;
  y_invert: boolean;

  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;

  x_autorange: boolean;
  y_autorange: boolean;

  title: string;
  background: string;
  plot_engine?: "plotly" | "echarts";
}

/* ──────────────────────────────────────────────────────────────────────────
 * Evaluator
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Evaluates and displays a property value using a custom expression.
 */
export interface EvaluatorProps extends BaseLabelProps {
  widget_type: "Evaluator";
  keys: string[];
  expression: string; // Python-like expression, e.g., "{:.2e}".format(x)
}

/* ──────────────────────────────────────────────────────────────────────────
 * Display Table Element
 * ────────────────────────────────────────────────────────────────────────── */

/** Displays a table from a property. */
export interface DisplayTableElementProps extends BaseLabelProps {
  widget_type: "DisplayTableElement";
  keys: string[];
  resizeToContents?: boolean;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Union Type
 * ────────────────────────────────────────────────────────────────────────── */

/** All display controller prop types. */
export type DisplayControllerProps =
  | DisplayLabelProps
  | DisplayListProps
  | DisplayFloatProps
  | DisplayAlarmFloatProps
  | DisplayCheckBoxProps
  | DisplayLineEditProps
  | DisplayCommandProps
  | DisplayStateColorProps
  | DisplayStatefulIconProps
  | DisplayTrendGraphProps
  | EvaluatorProps
  | DisplayTableElementProps;
