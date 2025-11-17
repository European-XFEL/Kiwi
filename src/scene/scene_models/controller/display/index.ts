/**
 * scene_model/controller/display
 *
 * Controller widget classes (Display* and Editable* widgets)
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
  EvaluatorProps,
  DisplayTableElementProps,
} from "@/scene/scene_types/controllers";

import { BaseControllerWidgetModel } from "../../BaseModels";

// ============================================================================
// DISPLAY CONTROLLERS
// ============================================================================

export class DisplayLabelElementModel extends BaseControllerWidgetModel<DisplayLabelProps> {
  parent_component = "DisplayComponent" as const;

  get props(): DisplayLabelProps {
    return {
      element_type: "widget",
      widget_type: "DisplayLabel",
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

export class DisplayListElementModel extends BaseControllerWidgetModel<DisplayListProps> {
  parent_component = "DisplayComponent" as const;

  get props(): DisplayListProps {
    return {
      element_type: "widget",
      widget_type: "DisplayList",
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

export class DisplayFloatElementModel extends BaseControllerWidgetModel<DisplayFloatProps> {
  parent_component = "DisplayComponent" as const;
  fmt = "g";
  decimals = "8";

  get props(): DisplayFloatProps {
    return {
      element_type: "widget",
      widget_type: "DisplayFloat",
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

export class DisplayAlarmFloatElementModel extends BaseControllerWidgetModel<DisplayAlarmFloatProps> {
  parent_component = "DisplayComponent" as const;
  fmt = "g";
  decimals = "8";
  alarm_high?: number;
  alarm_low?: number;
  warn_high?: number;
  warn_low?: number;

  get props(): DisplayAlarmFloatProps {
    return {
      element_type: "widget",
      widget_type: "DisplayAlarmFloat",
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

export class DisplayCheckBoxElementModel extends BaseControllerWidgetModel<DisplayCheckBoxProps> {
  parent_component = "DisplayComponent" as const;

  get props(): DisplayCheckBoxProps {
    return {
      element_type: "widget",
      widget_type: "DisplayCheckBox",
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
export class DisplayLineEditElementModel extends BaseControllerWidgetModel<DisplayLineEditProps> {
  parent_component = "DisplayComponent" as const;

  get props(): DisplayLineEditProps {
    return {
      element_type: "widget",
      widget_type: "DisplayLineEdit",
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

export class DisplayCommandElementModel extends BaseControllerWidgetModel<DisplayCommandProps> {
  parent_component = "DisplayComponent" as const;
  requires_confirmation = false;

  get props(): DisplayCommandProps {
    return {
      element_type: "widget",
      widget_type: "DisplayCommand",
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

export class DisplayStateColorElementModel extends BaseControllerWidgetModel<DisplayStateColorProps> {
  parent_component = "DisplayComponent" as const;
  show_string = false;

  get props(): DisplayStateColorProps {
    return {
      element_type: "widget",
      widget_type: "DisplayStateColor",
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

export class DisplayStatefulIconElementModel extends BaseControllerWidgetModel<DisplayStatefulIconProps> {
  parent_component = "DisplayComponent" as const;
  icon_name = "no_icon";

  get props(): DisplayStatefulIconProps {
    return {
      element_type: "widget",
      widget_type: "DisplayStatefulIcon",
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

export class DisplayTrendGraphElementModel extends BaseControllerWidgetModel<DisplayTrendGraphProps> {
  parent_component = "DisplayComponent" as const;
  x_label = "";
  y_label = "";
  x_units = "";
  y_units = "";
  x_grid = false;
  y_grid = false;
  x_log = false;
  y_log = false;
  x_invert = false;
  y_invert = false;
  x_min = 0;
  x_max = 0;
  y_min = 0;
  y_max = 0;
  x_autorange = true;
  y_autorange = true;
  title = "";
  background = "transparent";

  get props(): DisplayTrendGraphProps {
    return {
      element_type: "widget",
      widget_type: "DisplayTrendGraph",
      parent_component: this.parent_component,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      keys: this.keys ?? [],
      font_size: this.font_size,
      font_weight: this.font_weight,
      x_label: this.x_label,
      y_label: this.y_label,
      x_units: this.x_units,
      y_units: this.y_units,
      x_grid: this.x_grid,
      y_grid: this.y_grid,
      x_log: this.x_log,
      y_log: this.y_log,
      x_invert: this.x_invert,
      y_invert: this.y_invert,
      x_min: this.x_min,
      x_max: this.x_max,
      y_min: this.y_min,
      y_max: this.y_max,
      x_autorange: this.x_autorange,
      y_autorange: this.y_autorange,
      title: this.title,
      background: this.background,
      layout_data: this.layout_data,
    };
  }
}

export class EvaluatorElementModel extends BaseControllerWidgetModel<EvaluatorProps> {
  parent_component = "DisplayComponent" as const;
  expression = "";

  get props(): EvaluatorProps {
    return {
      element_type: "widget",
      widget_type: "Evaluator",
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

export class DisplayTableElementModel extends BaseControllerWidgetModel<DisplayTableElementProps> {
  parent_component = "DisplayComponent" as const;
  resizeToContents = false;

  get props(): DisplayTableElementProps {
    return {
      element_type: "widget",
      widget_type: "DisplayTableElement",
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
