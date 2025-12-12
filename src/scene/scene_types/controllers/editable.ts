import { BaseEditWidgetProps } from './../base';
import { BaseControllerWidgetProps } from '../controller_base';

/**
 * Editable controller widget prop definitions (user-input components).
 * These extend BaseControllerWidgetProps to get runtime-injected props.
 */

/* ──────────────────────────────────────────────────────────────────────────
 * Editable ComboBox
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Dropdown input allowing selection from a list of options.

 */
export interface EditableComboBoxProps extends BaseControllerWidgetProps {
  widget_type: 'EditableComboBox';
  parent_component: 'EditableApplyLaterComponent';
}

/* ──────────────────────────────────────────────────────────────────────────
 * Editable List
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Editable list allowing item selection or inline editing.
 * Used for VectorBinding properties.
 */
export interface EditableListProps extends BaseControllerWidgetProps {
  widget_type: 'EditableList';
  parent_component: 'EditableApplyLaterComponent';
}

/* ──────────────────────────────────────────────────────────────────────────
 * Editable Regex List
 * ────────────────────────────────────────────────────────────────────────── */

/** List editor with regex validation per item. */
export interface EditableRegexListProps extends BaseEditWidgetProps {
  widget_type: 'EditableRegexList';
  keys: string[];
  font_size: number | string;
  font_weight: 'normal' | 'bold';
}

/* ──────────────────────────────────────────────────────────────────────────
 * Editable LineEdit
 * ────────────────────────────────────────────────────────────────────────── */

/** Text input field for editing string values. */
export interface EditableLineEditProps extends BaseControllerWidgetProps {
  widget_type: 'EditableLineEdit';
  parent_component: 'EditableApplyLaterComponent';
}

/* ──────────────────────────────────────────────────────────────────────────
 * Editable SpinBox
 * ────────────────────────────────────────────────────────────────────────── */

/** Numeric input with increment/decrement controls. */
export interface EditableSpinBoxProps extends BaseEditWidgetProps {
  widget_type: 'EditableSpinBox';
  keys: string[];
  font_size: number | string;
  font_weight: 'normal' | 'bold';
}

/* ──────────────────────────────────────────────────────────────────────────
 * Editable CheckBox
 * ────────────────────────────────────────────────────────────────────────── */

/** Boolean input represented as a checkbox. */
export interface EditableCheckBoxProps extends BaseEditWidgetProps {
  widget_type: 'EditableCheckBox';
  keys: string[];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Double LineEdit (Float input)
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Float input field with configurable decimal precision.
 */
export interface DoubleLineEditProps extends BaseControllerWidgetProps {
  widget_type: 'DoubleLineEdit';
  parent_component: 'EditableApplyLaterComponent';
  decimals: number; // -1 for auto, 0-12 for fixed precision
}

/* ──────────────────────────────────────────────────────────────────────────
 * Int LineEdit (Integer input)
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Integer input field with validation.
 */
export interface IntLineEditProps extends BaseControllerWidgetProps {
  widget_type: 'IntLineEdit';
  parent_component: 'EditableApplyLaterComponent';
}

/* ──────────────────────────────────────────────────────────────────────────
 * Hexadecimal (Hex input)
 * ────────────────────────────────────────────────────────────────────────── */

/** Hexadecimal integer input field. */
export interface HexadecimalProps extends BaseEditWidgetProps {
  widget_type: 'Hexadecimal';
  keys: string[];
  font_size: number | string;
  font_weight: 'normal' | 'bold';
}

/* ──────────────────────────────────────────────────────────────────────────
 * Regex Edit (String input with regex validation)
 * ────────────────────────────────────────────────────────────────────────── */

/** String input field with regex validation. */
export interface EditableRegexProps extends BaseEditWidgetProps {
  widget_type: 'RegexEdit';
  keys: string[];
  font_size: number | string;
  font_weight: 'normal' | 'bold';
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
