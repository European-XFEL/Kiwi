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
