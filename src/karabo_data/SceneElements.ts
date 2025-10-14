import {
  FONT_BASE_SIZE,
  FONT_FAMILY_DEFAULT,
} from "../components/scene_widgets/shared/helpers/QtFontDescriptor";

export interface SceneElementProps {
  x: number;
  y: number;
  width: number;
  height: number;
  key: string;
}

export class SceneElement {
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  key = `sceneElement_${crypto.randomUUID()}`;

  get props(): SceneElementProps {
    return { ...this };
  }
}

export class WidgetElement<
  PropsType extends SceneElementProps
> extends SceneElement {
  // The corresponding React component to be rendered
  reactComponent?: React.FC<PropsType>;
}

export interface LabelElementProps extends SceneElementProps {
  text: string;
  backgroundColor: string;
  foregroundColor: string;
  frameWidth: number;
  fontFamily: string;
  fontSize: string;
  fontStyle: string;
  fontWeight: string;
  textDecoration: string;
  alignment: "left" | "center" | "right";
}

export class LabelElement extends WidgetElement<LabelElementProps> {
  text = "";
  backgroundColor = "#FFFFFF";
  foregroundColor = "#000000";
  frameWidth = 0;
  fontFamily = FONT_FAMILY_DEFAULT;
  fontSize = `${FONT_BASE_SIZE}px`;
  fontWeight = "normal";
  fontStyle = "normal";
  textDecoration = "none";
  alignment: "left" | "center" | "right" = "left";

  get props(): LabelElementProps {
    return { ...this };
  }
}

export interface DynamicElementProps extends SceneElementProps {
  karaboKeys: string;
  fontSize: number;
  fontWeight: "BOLD" | "NORMAL";
}

export class DynamicWidgetElement<
  PropsType extends DynamicElementProps
> extends WidgetElement<PropsType> {
  karaboKeys: string = "";
  fontSize: number = FONT_BASE_SIZE;
  fontWeight: "BOLD" | "NORMAL" = "NORMAL";

  get props(): PropsType {
    return { ...(this as unknown as PropsType) };
  }
}

export interface DisplayCommandElementProps extends DynamicElementProps {
  requiresConfirmation: boolean;
}
export class DisplayCommandElement extends DynamicWidgetElement<DisplayCommandElementProps> {
  requiresConfirmation: boolean = false;

  get props(): DisplayCommandElementProps {
    return { ...(this as unknown as DisplayCommandElementProps) };
  }
}

export interface DisplayStateColorElementProps extends DynamicElementProps {
  showString: boolean;
}

export class DisplayStateColorElement extends DynamicWidgetElement<DisplayStateColorElementProps> {
  showString: boolean = false;
  get props(): DisplayStateColorElementProps {
    return { ...(this as unknown as DisplayStateColorElementProps) };
  }
}

export interface RectangleElementProps extends SceneElementProps {
  strokeWidth: number;
  strokeColor: string;
  fillColor: string;
  widgets: WidgetElement<SceneElementProps>[];
}
export class RectangleElement extends WidgetElement<RectangleElementProps> {
  strokeWidth: number = 0;
  strokeColor: string = "#000000";
  fillColor: string = "transparent";
  widgets: WidgetElement<SceneElementProps>[] = [];

  get props(): RectangleElementProps {
    return { ...(this as unknown as RectangleElementProps) };
  }
}

export interface DisplayTrendGraphElementProps extends DynamicElementProps {
  //Axis labels and units
  xLabel: string;
  yLabel: string;
  xUnits: string;
  yUnits: string;
  //Grid toggles
  xGrid: boolean;
  yGrid: boolean;
  //Logarithmic scales
  xLog: boolean;
  yLog: boolean;
  //Axis inversion
  xInvert: boolean;
  yInvert: boolean;
  //Axis limits
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  //Auto-ranging flags
  xAutorange: boolean;
  yAutorange: boolean;
  //Title and background color
  title: string;
  background: string;
}

export class DisplayTrendGraphElement extends DynamicWidgetElement<DisplayTrendGraphElementProps> {
  xLabel = "";
  yLabel = "";
  xUnits = "";
  yUnits = "";
  xGrid = false;
  yGrid = false;
  xLog = false;
  yLog = false;
  xInvert = false;
  yInvert = false;
  xMin = 0.0;
  xMax = 0.0;
  yMin = 0.0;
  yMax = 0.0;
  xAutorange = true;
  yAutorange = true;
  title = "";
  background = "transparent";

  get props(): DisplayTrendGraphElementProps {
    return { ...(this as unknown as DisplayTrendGraphElementProps) };
  }
}
