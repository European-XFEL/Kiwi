import { BaseEditWidgetProps } from "./../base";
/**
 * Editable controller widget prop definitions (user-input components).
 * These extend BaseEditWidget and belong to "EditableApplyLaterComponent".
 */

/* ──────────────────────────────────────────────────────────────────────────
 * Editable ComboBox
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Dropdown input allowing selection from a list of options.
 *
 * Example:
 * <svg:rect krb:class="EditableApplyLaterComponent"
 *           krb:widget="EditableComboBox"
 *           krb:keys="device.property"
 *           x="354" y="280" width="64" height="25" />
 */
export interface EditableComboBoxProps extends BaseEditWidgetProps {
  widget_type: "EditableComboBox";
  keys: string[];
  font_size: number | string;
  font_weight: "normal" | "bold";
}

/* ──────────────────────────────────────────────────────────────────────────
 * Editable List
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Editable list allowing item selection or inline editing.
 * Used for VectorBinding properties.
 *
 * Example:
 * <svg:rect krb:class="EditableApplyLaterComponent"
 *           krb:widget="EditableList"
 *           krb:keys="Test/mdl.availableScenes"
 *           x="178" y="500" width="145" height="27" />
 */
export interface EditableListProps extends BaseEditWidgetProps {
  widget_type: "EditableList";
  keys: string[];
  font_size: number | string;
  font_weight: "normal" | "bold";
}

/* ──────────────────────────────────────────────────────────────────────────
 * Editable Regex List
 * ────────────────────────────────────────────────────────────────────────── */

/** List editor with regex validation per item. */
export interface EditableRegexListProps extends BaseEditWidgetProps {
  widget_type: "EditableRegexList";
  keys: string[];
  font_size: number | string;
  font_weight: "normal" | "bold";
}

/* ──────────────────────────────────────────────────────────────────────────
 * Editable LineEdit
 * ────────────────────────────────────────────────────────────────────────── */

/** Text input field for editing string values. */
export interface EditableLineEditProps extends BaseEditWidgetProps {
  widget_type: "EditableLineEdit";
  keys: string[];
  font_size: number | string;
  font_weight: "normal" | "bold";
}

/* ──────────────────────────────────────────────────────────────────────────
 * Editable SpinBox
 * ────────────────────────────────────────────────────────────────────────── */

/** Numeric input with increment/decrement controls. */
export interface EditableSpinBoxProps extends BaseEditWidgetProps {
  widget_type: "EditableSpinBox";
  keys: string[];
  font_size: number | string;
  font_weight: "normal" | "bold";
}

/* ──────────────────────────────────────────────────────────────────────────
 * Editable CheckBox
 * ────────────────────────────────────────────────────────────────────────── */

/** Boolean input represented as a checkbox. */
export interface EditableCheckBoxProps extends BaseEditWidgetProps {
  widget_type: "EditableCheckBox";
  keys: string[];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Double LineEdit (Float input)
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Float input field with configurable decimal precision.
 */
export interface DoubleLineEditProps extends BaseEditWidgetProps {
  widget_type: "DoubleLineEdit";
  keys: string[];
  decimals: number; // -1 for auto, 0-12 for fixed precision
  font_size: number | string;
  font_weight: "normal" | "bold";
}

/* ──────────────────────────────────────────────────────────────────────────
 * Int LineEdit (Integer input)
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Integer input field with validation.
 */
export interface IntLineEditProps extends BaseEditWidgetProps {
  widget_type: "IntLineEdit";
  keys: string[];
  font_size: number | string;
  font_weight: "normal" | "bold";
}

/* ──────────────────────────────────────────────────────────────────────────
 * Hexadecimal (Hex input)
 * ────────────────────────────────────────────────────────────────────────── */

/** Hexadecimal integer input field. */
export interface HexadecimalProps extends BaseEditWidgetProps {
  widget_type: "Hexadecimal";
  keys: string[];
  font_size: number | string;
  font_weight: "normal" | "bold";
}

/* ──────────────────────────────────────────────────────────────────────────
 * Regex Edit (String input with regex validation)
 * ────────────────────────────────────────────────────────────────────────── */

/** String input field with regex validation. */
export interface EditableRegexProps extends BaseEditWidgetProps {
  widget_type: "RegexEdit";
  keys: string[];
  font_size: number | string;
  font_weight: "normal" | "bold";
}

/* ──────────────────────────────────────────────────────────────────────────
 * Union Type
 * ────────────────────────────────────────────────────────────────────────── */

/** All editable controller prop types. */
export type EditableControllerProps =
  | EditableComboBoxProps
  | EditableListProps
  | EditableRegexListProps
  | EditableLineEditProps
  | EditableSpinBoxProps
  | EditableCheckBoxProps
  | DoubleLineEditProps
  | IntLineEditProps
  | HexadecimalProps
  | EditableRegexProps;
