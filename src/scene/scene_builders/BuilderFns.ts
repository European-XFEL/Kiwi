/**
 * BuilderFns.ts
 * Builds model instances from parsed JSON.
 * Adds a visible placeholder for unknown widgets.
 */

// Base
import { BaseSceneElementModel } from "../scene_models/BaseModels";

// Helpers
import { css_textAlign_for_KrbAlignh } from "@/components/shared/helpers/KrbAlignh";
import { FONT_BASE_SIZE } from "@/components/shared/helpers/fontDefaults";

// Layouts
import {
  BoxLayoutModel,
  FixedLayoutModel,
  GridLayoutModel,
} from "../scene_models/LayoutModels";

// Shapes
import {
  LineModel,
  RectangleModel,
  PolygonModel,
  ArrowPolygonModel,
} from "../scene_models/ShapeModels";

// static widget
import { LabelModel } from "../scene_models/StaticWidgetModels";

//controllers
//display
import {
  DisplayLabelElementModel,
  DisplayCheckBoxElementModel,
  DisplayTrendGraphElementModel,
  //DisplayLineEditElementModel,
  DisplayListElementModel,
  DisplayStatefulIconElementModel,
  DisplayCommandElementModel,
  DisplayStateColorElementModel,
} from "../scene_models/controller/display";
//edit
import {
  EditableComboBoxElementModel,
  DoubleLineEditElement,
} from "../scene_models/controller/editable";

// React Components
import Label from "@/components/widgets/Label";
import DisplayLabel from "@/components/controllers/display/DisplayLabel";
import DisplayCommand from "@/components/controllers/display/DisplayCommand";
import Line from "@/components/shapes/Line";
import Rectangle from "@/components/shapes/Rectangle";
import Polygon from "@/components/shapes/Polygon";
import ArrowPolygon from "@/components/shapes/ArrowPolygon";
import DisplayStateColor from "@/components/controllers/display/DisplayStateColor";
import DisplayCheckbox from "@/components/controllers/display/DisplayCheckbox";
import DisplayStatefulWidgetIcon from "@/components/controllers/display/DisplayStatefulWidgetIcon";
import DisplayTrendGraph from "@/components/controllers/display/DisplayTrendGraph";
import EditableComboBox from "@/components/controllers/editable/EditableComboBox";
import DoubleLineEdit from "@/components/controllers/editable/DoubleLineEdit";
import FixedLayout from "@/components/layouts/FixedLayout";
import BoxLayout from "@/components/layouts/BoxLayout";
import GridLayout from "@/components/layouts/GridLayout";

// ============================================================================
// Entry point
// ============================================================================

export function buildElement(jsonElement: any): BaseSceneElementModel | null {
  const elementType = jsonElement.element_type;

  if (elementType === "widget") return buildWidget(jsonElement);
  if (elementType === "layout") return buildLayout(jsonElement);
  if (elementType === "shape") return buildShape(jsonElement);

  console.warn("Unknown element_type:", elementType);
  return null;
}

// ============================================================================
// Layouts
// ============================================================================

export function buildLayout(json: any): BaseSceneElementModel | null {
  switch (json.layout_type) {
    case "BoxLayout":
      return buildBoxLayout(json);
    case "FixedLayout":
      return buildFixedLayout(json);
    case "GridLayout":
      return buildGridLayout(json);
    default:
      console.warn("Unknown layout_type:", json.layout_type);
      return null;
  }
}

export function buildBoxLayout(json: any): BoxLayoutModel {
  const l = new BoxLayoutModel();
  l.reactComponent = awaitComponent(BoxLayout);
  Object.assign(l, {
    x: json.x ?? 0,
    y: json.y ?? 0,
    width: json.width ?? 0,
    height: json.height ?? 0,
    direction: json.direction ?? 0,
  });

  if (Array.isArray(json.children)) {
    json.children.forEach((childJson: any) => {
      const child = buildElement(childJson);
      if (child) l.addChild(child);
    });
  }
  return l;
}

export function buildFixedLayout(json: any): FixedLayoutModel {
  const l = new FixedLayoutModel();
  l.reactComponent = awaitComponent(FixedLayout);
  Object.assign(l, {
    x: json.x ?? 0,
    y: json.y ?? 0,
    width: json.width ?? 0,
    height: json.height ?? 0,
  });

  if (Array.isArray(json.children)) {
    json.children.forEach((childJson: any) => {
      const child = buildElement(childJson);
      if (child) l.addChild(child);
    });
  }
  return l;
}

export function buildGridLayout(json: any): GridLayoutModel {
  const l = new GridLayoutModel();
  l.reactComponent = awaitComponent(GridLayout);
  Object.assign(l, {
    x: json.x ?? 0,
    y: json.y ?? 0,
    width: json.width ?? 0,
    height: json.height ?? 0,
  });

  if (Array.isArray(json.children)) {
    json.children.forEach((childJson: any) => {
      const child = buildElement(childJson);
      if (child) {
        if (childJson.layout_data) {
          const { row, col, rowspan, colspan } = childJson.layout_data;
          l.addChildAtPosition(child, row, col, rowspan, colspan);
        } else {
          l.addChild(child);
        }
      }
    });
  }
  return l;
}

// ============================================================================
// Widgets
// ============================================================================

export function buildWidget(json: any): BaseSceneElementModel | null {
  const { widget_type, parent_component } = json;

  if (widget_type === "Label" && !parent_component) return buildLabel(json);

  if (parent_component === "DisplayComponent") {
    switch (widget_type) {
      case "DisplayLabel":
        return buildDisplayLabel(json);
      case "DisplayList":
        return buildDisplayList(json);
      case "DisplayCommand":
        return buildDisplayCommand(json);
      case "DisplayStateColor":
        return buildDisplayStateColor(json);
      case "DisplayCheckBox":
        return buildDisplayCheckBox(json);
      case "DisplayStatefulIcon":
      case "StatefulIconWidget":
        return buildDisplayStatefulIcon(json);
      case "DisplayTrendGraph":
        return buildDisplayTrendGraph(json);
    }
  }

  if (parent_component === "EditableApplyLaterComponent") {
    switch (widget_type) {
      case "EditableComboBox":
        return buildEditableComboBox(json);
      case "DoubleLineEdit":
        return buildDoubleLineEdit(json);
    }
  }

  console.warn("Unknown widget_type:", widget_type, parent_component);
  return buildPlaceholder(json);
}

// --- Static Label
export function buildLabel(json: any): LabelModel {
  const w = new LabelModel();
  w.reactComponent = Label;

  // Basic properties
  Object.assign(w, {
    x: json.x ?? 0,
    y: json.y ?? 0,
    width: json.width ?? 0,
    height: json.height ?? 0,
    text: json.text ?? "",
    foreground: json.foreground ?? "#000",
    background: json.background ?? "transparent",
    frame_width: json.frame_width ?? 0,
  });

  // Alignment handling: Support both numeric alignh (XML) and string alignment (JSON)
  if (json.alignh !== undefined) {
    // Convert numeric Qt alignment (1=left, 2=right, 4=center)
    w.alignment = css_textAlign_for_KrbAlignh(json.alignh);
  } else {
    // Use string alignment directly (or default to "left")
    w.alignment = json.alignment ?? "left";
  }

  // Font handling: Check for Qt font descriptor first, then fall back to individual properties
  if (json.font_descriptor) {
    // Parse Qt font descriptor string (e.g., "Source Sans Pro,10,-1,5,50,0,0,0,0,0")
    w.applyFontDescriptor(json.font_descriptor);
  } else {
    // Use individual font properties (from new JSON format or defaults)
    w.font_family = json.font_family ?? "Source Sans Pro";
    w.font_size = json.font_size ?? FONT_BASE_SIZE;
    w.font_weight = json.font_weight ?? "normal";
    w.font_style = json.font_style ?? "normal";
    w.text_decoration = json.text_decoration ?? "none";
  }

  return w;
}

// --- Placeholder
export function buildPlaceholder(json: any): LabelModel {
  const w = new LabelModel();
  w.reactComponent = Label;
  Object.assign(w, {
    x: json.x ?? 0,
    y: json.y ?? 0,
    width: json.width ?? 60,
    height: json.height ?? 24,
    text: "??",
    alignment: "center",
    foreground: "#FF0000",
    frame_width: 1,
  });
  return w;
}

// --- Display controllers
export function buildDisplayLabel(json: any): DisplayLabelElementModel {
  const w = new DisplayLabelElementModel();
  w.reactComponent = DisplayLabel;
  Object.assign(w, {
    x: json.x ?? 0,
    y: json.y ?? 0,
    width: json.width ?? 0,
    height: json.height ?? 0,
    keys: json.keys ?? [],
    font_size: json.font_size ?? FONT_BASE_SIZE,
    font_weight: json.font_weight ?? "normal",
  });
  return w;
}

export function buildDisplayList(json: any): DisplayListElementModel {
  const w = new DisplayListElementModel();
  Object.assign(w, {
    x: json.x ?? 0,
    y: json.y ?? 0,
    width: json.width ?? 0,
    height: json.height ?? 0,
    keys: json.keys ?? [],
    font_size: json.font_size ?? FONT_BASE_SIZE,
    font_weight: json.font_weight ?? "normal",
  });
  return w;
}

export function buildDisplayCommand(json: any): DisplayCommandElementModel {
  const w = new DisplayCommandElementModel();
  w.reactComponent = DisplayCommand;
  Object.assign(w, {
    x: json.x ?? 0,
    y: json.y ?? 0,
    width: json.width ?? 0,
    height: json.height ?? 0,
    keys: json.keys ?? [],
    font_size: json.font_size ?? FONT_BASE_SIZE,
    font_weight: json.font_weight ?? "normal",
    requires_confirmation: !!json.requires_confirmation,
  });
  return w;
}

export function buildDisplayStateColor(
  json: any
): DisplayStateColorElementModel {
  const w = new DisplayStateColorElementModel();
  w.reactComponent = DisplayStateColor;
  Object.assign(w, {
    x: json.x ?? 0,
    y: json.y ?? 0,
    width: json.width ?? 0,
    height: json.height ?? 0,
    keys: json.keys ?? [],
    font_size: json.font_size ?? FONT_BASE_SIZE,
    font_weight: json.font_weight ?? "normal",
    show_string: !!json.show_string,
  });
  return w;
}

export function buildDisplayCheckBox(json: any): DisplayCheckBoxElementModel {
  const w = new DisplayCheckBoxElementModel();
  w.reactComponent = DisplayCheckbox;
  Object.assign(w, {
    x: json.x ?? 0,
    y: json.y ?? 0,
    width: json.width ?? 0,
    height: json.height ?? 0,
    keys: json.keys ?? [],
    font_size: json.font_size ?? FONT_BASE_SIZE,
    font_weight: json.font_weight ?? "normal",
  });
  return w;
}

export function buildDisplayStatefulIcon(
  json: any
): DisplayStatefulIconElementModel {
  const w = new DisplayStatefulIconElementModel();
  w.reactComponent = DisplayStatefulWidgetIcon;

  const icon_name = json.icon_name ?? json["@_krb:icon_name"] ?? "no_icon";

  Object.assign(w, {
    x: json.x ?? 0,
    y: json.y ?? 0,
    width: json.width ?? 0,
    height: json.height ?? 0,
    keys: json.keys ?? [],
    font_size: json.font_size ?? FONT_BASE_SIZE,
    font_weight: json.font_weight ?? "normal",
    icon_name,
  });

  return w;
}

export function buildDisplayTrendGraph(
  json: any
): DisplayTrendGraphElementModel {
  const w = new DisplayTrendGraphElementModel();
  w.reactComponent = DisplayTrendGraph;
  Object.assign(w, {
    x: json.x ?? 0,
    y: json.y ?? 0,
    width: json.width ?? 0,
    height: json.height ?? 0,
    keys: json.keys ?? [],
    font_size: json.font_size ?? FONT_BASE_SIZE,
    font_weight: json.font_weight ?? "normal",
    x_label: json.x_label ?? "",
    y_label: json.y_label ?? "",
    x_units: json.x_units ?? "",
    y_units: json.y_units ?? "",
    x_grid: !!json.x_grid,
    y_grid: !!json.y_grid,
    x_log: !!json.x_log,
    y_log: !!json.y_log,
    x_invert: !!json.x_invert,
    y_invert: !!json.y_invert,
    x_min: json.x_min ?? 0,
    x_max: json.x_max ?? 0,
    y_min: json.y_min ?? 0,
    y_max: json.y_max ?? 0,
    x_autorange: json.x_autorange ?? true,
    y_autorange: json.y_autorange ?? true,
    title: json.title ?? "",
    background: json.background ?? "transparent",
  });
  return w;
}

// --- Editable
export function buildEditableComboBox(json: any): EditableComboBoxElementModel {
  const w = new EditableComboBoxElementModel();
  w.reactComponent = EditableComboBox;
  Object.assign(w, {
    x: json.x ?? 0,
    y: json.y ?? 0,
    width: json.width ?? 0,
    height: json.height ?? 0,
    keys: json.keys ?? [],
    font_size: json.font_size ?? FONT_BASE_SIZE,
    font_weight: json.font_weight ?? "normal",
  });
  return w;
}

export function buildDoubleLineEdit(json: any): DoubleLineEditElement {
  const w = new DoubleLineEditElement();
  w.reactComponent = DoubleLineEdit;
  Object.assign(w, {
    x: json.x ?? 0,
    y: json.y ?? 0,
    width: json.width ?? 0,
    height: json.height ?? 0,
    keys: json.keys ?? [],
    decimals: json.decimals ?? -1,
    font_size: json.font_size ?? 10,
    font_weight: json.font_weight ?? "normal",
  });
  return w;
}

// ============================================================================
// Shapes
// ============================================================================

export function buildShape(json: any): BaseSceneElementModel | null {
  switch (json.shape_type) {
    case "Line":
      return buildLine(json);
    case "Rectangle":
      return buildRectangle(json);
    case "Polygon":
      return buildPolygon(json);
    case "ArrowPolygon":
      return buildArrowPolygon(json);
    default:
      console.warn("Unknown shape_type:", json.shape_type);
      return null;
  }
}

export function buildLine(json: any): LineModel {
  const l = new LineModel();
  l.reactComponent = Line;
  Object.assign(l, {
    x1: json.x1 ?? 0,
    y1: json.y1 ?? 0,
    x2: json.x2 ?? 0,
    y2: json.y2 ?? 0,
    stroke: json.stroke ?? "none",
    stroke_width: json.stroke_width ?? 1.0,
    stroke_opacity: json.stroke_opacity ?? 1.0,
    fill: json.fill ?? "none",
  });
  return l;
}

export function buildRectangle(json: any): RectangleModel {
  const r = new RectangleModel();
  r.reactComponent = Rectangle;
  Object.assign(r, {
    x: json.x ?? 0,
    y: json.y ?? 0,
    width: json.width ?? 0,
    height: json.height ?? 0,
    stroke: json.stroke ?? "none",
    fill: json.fill ?? "none",
  });
  return r;
}

export function buildPolygon(json: any): PolygonModel {
  const p = new PolygonModel();
  p.reactComponent = Polygon;
  Object.assign(p, {
    points: json.points ?? "",
    stroke: json.stroke ?? "none",
    fill: json.fill ?? "#000",
  });
  return p;
}

export function buildArrowPolygon(json: any): ArrowPolygonModel {
  const a = new ArrowPolygonModel();
  a.reactComponent = ArrowPolygon;
  Object.assign(a, {
    x1: json.x1 ?? 0,
    y1: json.y1 ?? 0,
    x2: json.x2 ?? 0,
    y2: json.y2 ?? 0,
    hx1: json.hx1 ?? 0,
    hy1: json.hy1 ?? 0,
    hx2: json.hx2 ?? 0,
    hy2: json.hy2 ?? 0,
    stroke: json.stroke ?? "none",
    fill: json.fill ?? "none",
  });
  return a;
}

// ============================================================================
// Helpers
// ============================================================================

function awaitComponent<T>(component: T): T {
  return component;
}
