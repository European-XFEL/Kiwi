/**
 * scene_model/controller/editable
 *
 * Controller widget classes (Editable* widgets)
 */

import { BaseControllerWidgetModel } from "../../BaseModels";

import type {
  EditableComboBoxProps,
  EditableListProps,
  EditableLineEditProps,
  EditableSpinBoxProps,
  EditableCheckBoxProps,
  DoubleLineEditProps,
  IntLineEditProps,
  HexadecimalProps,
  EditableRegexProps,
  EditableRegexListProps,
} from "@/scene/scene_types/controllers";

// ============================================================================
// EDITABLE CONTROLLERS
// ============================================================================

export class EditableComboBoxElementModel extends BaseControllerWidgetModel<EditableComboBoxProps> {
  parent_component = "EditableApplyLaterComponent" as const;

  get props(): EditableComboBoxProps {
    return {
      element_type: "widget",
      widget_type: "EditableComboBox",
      parent_component: this.parent_component,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      keys: this.keys ?? [],
      font_size: this.font_size,
      font_weight: this.font_weight,
      layout_data: this.layout_data,
    };
  }
}

export class EditableListElement extends BaseControllerWidgetModel<EditableListProps> {
  parent_component = "EditableApplyLaterComponent" as const;

  get props(): EditableListProps {
    return {
      element_type: "widget",
      widget_type: "EditableList",
      parent_component: this.parent_component,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      keys: this.keys ?? [],
      font_size: this.font_size,
      font_weight: this.font_weight,
      layout_data: this.layout_data,
    };
  }
}

export class EditableLineEditElement extends BaseControllerWidgetModel<EditableLineEditProps> {
  parent_component = "EditableApplyLaterComponent" as const;

  get props(): EditableLineEditProps {
    return {
      element_type: "widget",
      widget_type: "EditableLineEdit",
      parent_component: this.parent_component,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      keys: this.keys ?? [],
      font_size: this.font_size,
      font_weight: this.font_weight,
      layout_data: this.layout_data,
    };
  }
}

export class EditableSpinBoxElement extends BaseControllerWidgetModel<EditableSpinBoxProps> {
  parent_component = "EditableApplyLaterComponent" as const;

  get props(): EditableSpinBoxProps {
    return {
      element_type: "widget",
      widget_type: "EditableSpinBox",
      parent_component: this.parent_component,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      keys: this.keys ?? [],
      font_size: this.font_size,
      font_weight: this.font_weight,
      layout_data: this.layout_data,
    };
  }
}

export class EditableCheckBoxElement extends BaseControllerWidgetModel<EditableCheckBoxProps> {
  parent_component = "EditableApplyLaterComponent" as const;

  get props(): EditableCheckBoxProps {
    return {
      element_type: "widget",
      widget_type: "EditableCheckBox",
      parent_component: this.parent_component,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      keys: this.keys ?? [],
      layout_data: this.layout_data,
    };
  }
}

// ============================================================================
// LINE EDIT CONTROLLERS
// ============================================================================

/**
 * DoubleLineEdit - Float input field with configurable decimal precision
 */
export class DoubleLineEditElement extends BaseControllerWidgetModel<DoubleLineEditProps> {
  parent_component = "EditableApplyLaterComponent" as const;
  decimals = -1; // -1 for auto, 0-12 for fixed precision

  get props(): DoubleLineEditProps {
    return {
      element_type: "widget",
      widget_type: "DoubleLineEdit",
      parent_component: this.parent_component,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      keys: this.keys ?? [],
      decimals: this.decimals,
      font_size: this.font_size,
      font_weight: this.font_weight,
      layout_data: this.layout_data,
    };
  }
}

/**
 * EditableListElement - List editor for VectorBinding properties
 * Note: This updates the existing EditableListElement to use the new naming
 */
export class EditableListElementModel extends BaseControllerWidgetModel<EditableListProps> {
  parent_component = "EditableApplyLaterComponent" as const;

  get props(): EditableListProps {
    return {
      element_type: "widget",
      widget_type: "EditableList",
      parent_component: this.parent_component,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      keys: this.keys ?? [],
      font_size: this.font_size,
      font_weight: this.font_weight,
      layout_data: this.layout_data,
    };
  }
}
