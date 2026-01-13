/**
 *
 * Display controller widget model classes
 *
 * All display controllers extend BaseControllerContainerModel which:
 * - Auto-wraps components with ControllerContainerWrapper
 * - Centralizes useDeviceProperty calls (single subscription per widget)
 * - Injects device data via `primary` prop at runtime
 * - Eliminates duplicate hook calls in components
 *
 * Architecture:
 * Model → BaseControllerContainerModel → ControllerContainerWrapper.wrap()
 *      → ControllerContainer (data fetching) → Component (pure presentation)
 */

import type {
  DisplayLabelProps,
  DisplayListProps,
  DisplayFloatProps,
  DisplayAlarmFloatProps,
  DisplayCheckBoxProps,
  DisplayLineEditProps,
  DisplayCommandProps,
  DisplayStateColorProps,
  DisplayStatefulIconProps,
  DisplayTrendGraphProps,
  DisplayVectorGraphProps,
  EvaluatorProps,
  DisplayTableElementProps,
} from '@/scene/scene_types/controllers';

import { BaseControllerContainerModel } from '@/features/scene_view/BaseControllerContainerModel';
import { BaseGraphElementModel } from '../BaseGraphElementModel';

// ============================================================================
// DISPLAY CONTROLLERS
// ============================================================================

export class DisplayLabelElementModel extends BaseControllerContainerModel<DisplayLabelProps> {
  parent_component = 'DisplayComponent' as const;

  get props(): DisplayLabelProps {
    return {
      element_type: 'widget',
      widget_type: 'DisplayLabel',
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

export class DisplayListElementModel extends BaseControllerContainerModel<DisplayListProps> {
  parent_component = 'DisplayComponent' as const;

  get props(): DisplayListProps {
    return {
      element_type: 'widget',
      widget_type: 'DisplayList',
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

export class DisplayFloatElementModel extends BaseControllerContainerModel<DisplayFloatProps> {
  parent_component = 'DisplayComponent' as const;
  fmt = 'g';
  decimals = '8';

  get props(): DisplayFloatProps {
    return {
      element_type: 'widget',
      widget_type: 'DisplayFloat',
      parent_component: this.parent_component,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      keys: this.keys ?? [],
      font_size: this.font_size,
      font_weight: this.font_weight,
      fmt: this.fmt,
      decimals: this.decimals,
      layout_data: this.layout_data,
    };
  }
}

export class DisplayAlarmFloatElementModel extends BaseControllerContainerModel<DisplayAlarmFloatProps> {
  parent_component = 'DisplayComponent' as const;
  fmt = 'g';
  decimals = '8';
  alarm_high?: number;
  alarm_low?: number;
  warn_high?: number;
  warn_low?: number;

  get props(): DisplayAlarmFloatProps {
    return {
      element_type: 'widget',
      widget_type: 'DisplayAlarmFloat',
      parent_component: this.parent_component,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      keys: this.keys ?? [],
      font_size: this.font_size,
      font_weight: this.font_weight,
      fmt: this.fmt,
      decimals: this.decimals,
      alarm_high: this.alarm_high,
      alarm_low: this.alarm_low,
      warn_high: this.warn_high,
      warn_low: this.warn_low,
      layout_data: this.layout_data,
    };
  }
}

export class DisplayCheckBoxElementModel extends BaseControllerContainerModel<DisplayCheckBoxProps> {
  parent_component = 'DisplayComponent' as const;

  get props(): DisplayCheckBoxProps {
    return {
      element_type: 'widget',
      widget_type: 'DisplayCheckBox',
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

/**
 * Display LineEdit - read-only text field
 */
export class DisplayLineEditElementModel extends BaseControllerContainerModel<DisplayLineEditProps> {
  parent_component = 'DisplayComponent' as const;

  get props(): DisplayLineEditProps {
    return {
      element_type: 'widget',
      widget_type: 'DisplayLineEdit',
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

export class DisplayCommandElementModel extends BaseControllerContainerModel<DisplayCommandProps> {
  parent_component = 'DisplayComponent' as const;
  requires_confirmation = false;

  get props(): DisplayCommandProps {
    return {
      element_type: 'widget',
      widget_type: 'DisplayCommand',
      parent_component: this.parent_component,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      keys: this.keys ?? [],
      font_size: this.font_size,
      font_weight: this.font_weight,
      requires_confirmation: this.requires_confirmation,
      layout_data: this.layout_data,
    };
  }
}

export class DisplayStateColorElementModel extends BaseControllerContainerModel<DisplayStateColorProps> {
  parent_component = 'DisplayComponent' as const;
  show_string = false;

  get props(): DisplayStateColorProps {
    return {
      element_type: 'widget',
      widget_type: 'DisplayStateColor',
      parent_component: this.parent_component,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      keys: this.keys ?? [],
      font_size: this.font_size,
      font_weight: this.font_weight,
      show_string: this.show_string,
      layout_data: this.layout_data,
    };
  }
}

export class DisplayStatefulIconElementModel extends BaseControllerContainerModel<DisplayStatefulIconProps> {
  parent_component = 'DisplayComponent' as const;
  icon_name = 'no_icon';

  get props(): DisplayStatefulIconProps {
    return {
      element_type: 'widget',
      widget_type: 'DisplayStatefulIcon',
      parent_component: this.parent_component,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      keys: this.keys ?? [],
      font_size: this.font_size,
      font_weight: this.font_weight,
      icon_name: this.icon_name,
    };
  }
}

/**
 * DisplayTrendGraph - Time-series chart for property trends
 * Extends BaseGraphElementModel (DRY - all graph props centralized)
 */
export class DisplayTrendGraphElementModel extends BaseGraphElementModel<DisplayTrendGraphProps> {
  get props(): DisplayTrendGraphProps {
    return {
      ...this.getBaseGraphProps(),
      widget_type: 'DisplayTrendGraph',
    };
  }
}

/**
 * VectorGraph
 * -  offset, step, roi_tool
 */
export class DisplayVectorGraphElementModel extends BaseGraphElementModel<DisplayVectorGraphProps> {
  offset = 0.0;
  step = 1.0;
  roi_tool = 0;

  get props(): DisplayVectorGraphProps {
    return {
      ...this.getBaseGraphProps(),
      widget_type: 'DisplayVectorGraph',
      offset: this.offset,
      step: this.step,
      roi_tool: this.roi_tool,
    };
  }
}

export class EvaluatorElementModel extends BaseControllerContainerModel<EvaluatorProps> {
  parent_component = 'DisplayComponent' as const;
  expression = '';

  get props(): EvaluatorProps {
    return {
      element_type: 'widget',
      widget_type: 'Evaluator',
      parent_component: this.parent_component,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      keys: this.keys ?? [],
      font_size: this.font_size,
      font_weight: this.font_weight,
      expression: this.expression,
      layout_data: this.layout_data,
    };
  }
}

export class DisplayTableElementModel extends BaseControllerContainerModel<DisplayTableElementProps> {
  parent_component = 'DisplayComponent' as const;
  resizeToContents = false;

  get props(): DisplayTableElementProps {
    return {
      element_type: 'widget',
      widget_type: 'DisplayTableElement',
      parent_component: this.parent_component,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      keys: this.keys ?? [],
      font_size: this.font_size,
      font_weight: this.font_weight,
      resizeToContents: this.resizeToContents,
      layout_data: this.layout_data,
    };
  }
}
