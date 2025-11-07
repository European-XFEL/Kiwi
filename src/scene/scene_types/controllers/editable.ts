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

/** Editable list allowing item selection or inline editing. */
export interface EditableListProps extends BaseEditWidgetProps {
  widget_type: "EditableList";
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
 * Union Type
 * ────────────────────────────────────────────────────────────────────────── */

/** All editable controller prop types. */
export type EditableControllerProps =
  | EditableComboBoxProps
  | EditableListProps
  | EditableLineEditProps
  | EditableSpinBoxProps
  | EditableCheckBoxProps;
