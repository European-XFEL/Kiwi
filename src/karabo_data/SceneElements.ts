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
//Line property formation
export interface LineElementProps extends SceneElementProps {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity: number;
  strokeLinecap: "butt" | "round" | "square" | "inherit";
  strokeDasharray: string;
  strokeDashoffset: number;
  strokeLinejoin: "miter" | "round" | "bevel" | "inherit";
  strokeMiterlimit: number;
  fillColor: string;
  fillOpacity: number;
}
//line structure formation
export class LineElement extends WidgetElement<LineElementProps> {
  //#start point
  // X-coordinate of start point
  x1 = 0;
  // Y-coordinate of start point
  y1 = 0;

  //#end point
  // X-coordinate of end point
  x2 = 0;
  // Y-coordinate of end point
  y2 = 0;

  // Stroke styling: how the line is drawn
  strokeColor = "#000000";
  strokeWidth = 1.0;
  strokeOpacity = 1.0;
  strokeLinecap: "butt" | "round" | "square" | "inherit" = "butt";
  strokeDasharray = "";
  strokeDashoffset = 0.0;
  strokeLinejoin: "miter" | "round" | "bevel" | "inherit" = "miter";
  strokeMiterlimit = 4.0;
  fillColor = "none";
  fillOpacity = 1.0;

  // Computed bounding box: the smallest rectangle that contains the line
  get computedX(): number {
    // Leftmost x-coordinate: takes the smaller of the two endpoints
    // Example: line from x1=100 to x2=50 → computedX = 50
    return Math.min(this.x1, this.x2);
  }

  get computedY(): number {
    // Topmost y-coordinate: takes the smaller of the two endpoints
    // Example: line from y1=200 to y2=150 → computedY = 150
    return Math.min(this.y1, this.y2);
  }

  get computedWidth(): number {
    // Horizontal span of the line
    // Math.abs() ensures positive value regardless of line direction
    // Example: x1=100, x2=50 → |50-100| = 50 pixels wide
    // Example: x1=50, x2=100 → |100-50| = 50 pixels wide (same result)
    return Math.abs(this.x2 - this.x1);
  }

  get computedHeight(): number {
    // Vertical span of the line
    // Math.abs() converts negative differences to positive distances
    // Example: y1=200, y2=150 → |150-200| = 50 pixels tall
    // Example: y1=150, y2=200 → |200-150| = 50 pixels tall (same result)
    return Math.abs(this.y2 - this.y1);
  }

  // Helper method: returns the bounding box as an object
  // Useful for collision detection, positioning, layout calculations
  getBoundingBox() {
    return {
      x: this.computedX,
      y: this.computedY,
      width: this.computedWidth,
      height: this.computedHeight,
    };
  }

  get props(): LineElementProps {
    return {
      ...this,
      x: this.computedX,
      y: this.computedY,
      width: this.computedWidth,
      height: this.computedHeight,
      key: this.key,
    };
  }
}

// Represents an SVG <polygon> element (e.g. an arrowhead or shape)
export interface PolygonElementProps extends SceneElementProps {
  points: string; // "x1,y1 x2,y2 x3,y3"
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity: number;
  strokeLinecap: "butt" | "round" | "square" | "inherit";
  strokeDashoffset: number;
  strokeDasharray: string;
  strokeLinejoin: "miter" | "round" | "bevel" | "inherit";
  strokeMiterlimit: number;
  fillColor: string;
  fillOpacity: number;
}

export class PolygonElement extends WidgetElement<PolygonElementProps> {
  // ---- SVG Polygon Attributes ----
  points = ""; // e.g. "470,80 460,83 460,77" (triangle)

  // Stroke (outline) styling
  strokeColor = "#000000";
  strokeWidth = 1.0;
  strokeOpacity = 1.0;
  strokeLinecap: "butt" | "round" | "square" | "inherit" = "butt";
  strokeDashoffset = 0.0;
  strokeDasharray = "";
  strokeLinejoin: "miter" | "round" | "bevel" | "inherit" = "miter";
  strokeMiterlimit = 4.0;

  // Fill (interior) styling
  fillColor = "#000000";
  fillOpacity = 1.0;

  // ---- Private helper: parse "x1,y1 x2,y2" into [{x,y},...] ----
  #parsePoints(): Array<{ x: number; y: number }> {
    if (!this.points) return [];
    return this.points
      .trim()
      .split(/\s+/)
      .map((pair) => {
        const [x, y] = pair.split(",").map(Number);
        return { x, y };
      });
  }

  // ---- Compute bounding box (optimized to parse once) ----
  #getBounds() {
    const coords = this.#parsePoints();
    if (!coords.length) return { x: 0, y: 0, width: 0, height: 0 };

    const xs = coords.map((p) => p.x);
    const ys = coords.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  // ---- Computed accessors (readable + consistent with LineElement) ----
  get computedX(): number {
    return this.#getBounds().x;
  }
  get computedY(): number {
    return this.#getBounds().y;
  }
  get computedWidth(): number {
    return this.#getBounds().width;
  }
  get computedHeight(): number {
    return this.#getBounds().height;
  }

  // ---- Props for React rendering ----
  get props(): PolygonElementProps {
    const { x, y, width, height } = this.#getBounds();
    return {
      ...this,
      x,
      y,
      width,
      height,
      key: this.key,
    };
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

export interface ArrowPolygonElementProps extends SceneElementProps {
  line: LineElementProps;
  polygon: PolygonElementProps;
}
export class ArrowPolygonElement extends WidgetElement<ArrowPolygonElementProps> {
  line = new LineElement();
  polygon = new PolygonElement();

  // Convenience: Set both components at once
  setStrokeColor(color: string) {
    this.line.strokeColor = color;
    this.polygon.strokeColor = color;
  }

  // Bounding box: union of both components
  get computedX() {
    return Math.min(this.line.computedX, this.polygon.computedX);
  }

  get computedY() {
    return Math.min(this.line.computedY, this.polygon.computedY);
  }

  get computedWidth() {
    const minX = this.computedX;
    const maxX = Math.max(
      this.line.computedX + this.line.computedWidth,
      this.polygon.computedX + this.polygon.computedWidth
    );
    return maxX - minX;
  }

  get computedHeight() {
    const minY = this.computedY;
    const maxY = Math.max(
      this.line.computedY + this.line.computedHeight,
      this.polygon.computedY + this.polygon.computedHeight
    );
    return maxY - minY;
  }

  // Bounding box
  getBoundingBox() {
    return {
      x: this.computedX,
      y: this.computedY,
      width: this.computedWidth,
      height: this.computedHeight,
    };
  }

  get props(): ArrowPolygonElementProps {
    return {
      x: this.computedX,
      y: this.computedY,
      width: this.computedWidth,
      height: this.computedHeight,
      key: this.key,
      line: this.line.props,
      polygon: this.polygon.props,
    };
  }
}

export interface DisplayStatefulWidgetIconProps extends DynamicElementProps {
  iconName: string;
}

export class DisplayStatefulWidgetIconElement extends DynamicWidgetElement<DisplayStatefulWidgetIconProps> {
  iconName = "no_icon";

  get prop(): DisplayStatefulWidgetIconProps {
    return { ...(this as unknown as DisplayStatefulWidgetIconProps) };
  }
}
