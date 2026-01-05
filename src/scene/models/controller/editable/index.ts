/**
 * scene_model/controller/editable
 *
 * Editable controller widget model classes
 *
 * All editable controllers extend BaseControllerContainerModel which:
 * - Auto-wraps components with ControllerContainerWrapper
 * - Centralizes useDeviceProperty calls (single subscription per widget)
 * - Injects device data via `primary` prop at runtime
 * - Eliminates duplicate hook calls in components
 *
 * Architecture:
 * Model → BaseControllerContainerModel → ControllerContainerWrapper.wrap()
 *      → ControllerContainer (data fetching) → Component (pure presentation)
 */

import { BaseControllerContainerModel } from '@/scene_view/BaseControllerContainerModel';

import type {
  EditableComboBoxProps,
  EditableListProps,
  EditableLineEditProps,
  EditableSpinBoxProps,
  EditableCheckBoxProps,
  DoubleLineEditProps,
  IntLineEditProps,
} from '@/scene/scene_types/controllers';

// ============================================================================
// EDITABLE CONTROLLERS
// ============================================================================

export class EditableComboBoxElementModel extends BaseControllerContainerModel<EditableComboBoxProps> {
  parent_component = 'EditableApplyLaterComponent' as const;

  get props(): EditableComboBoxProps {
    return {
      element_type: 'widget',
      widget_type: 'EditableComboBox',
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

export class EditableListElementModel extends BaseControllerContainerModel<EditableListProps> {
  parent_component = 'EditableApplyLaterComponent' as const;

  get props(): EditableListProps {
    return {
      element_type: 'widget',
      widget_type: 'EditableList',
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

export class EditableLineEditElementModel extends BaseControllerContainerModel<EditableLineEditProps> {
  parent_component = 'EditableApplyLaterComponent' as const;

  get props(): EditableLineEditProps {
    return {
      element_type: 'widget',
      widget_type: 'EditableLineEdit',
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

export class EditableSpinBoxElementModel extends BaseControllerContainerModel<EditableSpinBoxProps> {
  parent_component = 'EditableApplyLaterComponent' as const;

  get props(): EditableSpinBoxProps {
    return {
      element_type: 'widget',
      widget_type: 'EditableSpinBox',
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

export class EditableCheckBoxElementModel extends BaseControllerContainerModel<EditableCheckBoxProps> {
  parent_component = 'EditableApplyLaterComponent' as const;

  get props(): EditableCheckBoxProps {
    return {
      element_type: 'widget',
      widget_type: 'EditableCheckBox',
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
export class DoubleLineEditElementModel extends BaseControllerContainerModel<DoubleLineEditProps> {
  parent_component = 'EditableApplyLaterComponent' as const;

  decimals = -1; // -1 for auto, 0-12 for fixed precision

  get props(): DoubleLineEditProps {
    return {
      element_type: 'widget',
      widget_type: 'DoubleLineEdit',
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
 * IntLineEdit - Integer input field with validation
 */
export class IntLineEditElementModel extends BaseControllerContainerModel<IntLineEditProps> {
  parent_component = 'EditableApplyLaterComponent' as const;

  get props(): IntLineEditProps {
    return {
      element_type: 'widget',
      widget_type: 'IntLineEdit',
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
