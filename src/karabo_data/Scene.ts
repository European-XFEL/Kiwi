import DisplayCommand from "../components/scene_widgets/DisplayCommand";
import DisplayLabel from "../components/scene_widgets/DisplayLabel";
import DisplayStateColor from "../components/scene_widgets/displayStateColor/DisplayStateColor";
import Label from "../components/scene_widgets/Label";
import Rectangle from "../components/scene_widgets/Rectangle";
import DisplayTrendGraph from "@/components/scene_widgets/plots/displayTrendGraph/DisplayTrendGraph";
import { css_textAlign_for_KrbAlignh } from "../components/scene_widgets/shared/helpers/KrbAlignh";
import { QtFontDescriptor } from "../components/scene_widgets/shared/helpers/QtFontDescriptor";
import {
  DisplayCommandElement,
  DisplayStateColorElement,
  DynamicWidgetElement,
  DynamicElementProps,
  LabelElement,
  RectangleElement,
  SceneElement,
  SceneElementProps,
  WidgetElement,
  DisplayCommandElementProps,
  DisplayTrendGraphElement,
} from "./SceneElements";

export class Scene {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #_sceneObj: any;
  #_height: number;
  #_width: number;
  #_elements: SceneElement[] = [];

  constructor(sceneJson: string) {
    this.#_sceneObj = JSON.parse(sceneJson);
    // console.log(sceneJson);
    this.#_width = parseInt(this.#_sceneObj["@_width"] as string);
    this.#_height = parseInt(this.#_sceneObj["@_height"] as string);
    this.#_buildSceneElements(this.#_sceneObj);
  }

  get sceneElements() {
    return this.#_elements;
  }

  get height(): number {
    return this.#_height;
  }

  get width(): number {
    return this.#_width;
  }

  // #region Internal buildScene helpers

  #_buildSceneElements = (startObj: object): void => {
    for (const [prop, value] of Object.entries(startObj)) {
      if (prop === "svg:g") {
        this.#_buildSceneElementsFromGroup(value as object);
      } else if (prop === "svg:rect") {
        if (value instanceof Array) {
          // Found a rect that is a container for other elements
          this.#_buildSceneElementsFromRect(value as object);
        } else {
          // Found a rect that hosts a single element
          this.#_buildSceneElementInRect(value as object);
        }
      }
    }
  };

  #_buildSceneElementsFromGroup = (groupObj: object): void => {
    if (groupObj instanceof Array) {
      (groupObj as object[]).forEach((groupChild: object) => {
        this.#_processGroupChild(groupChild);
      });
    } else {
      this.#_processGroupChild(groupObj);
    }
  };

  #_processGroupChild = (groupChild: object): void => {
    if (Object.prototype.hasOwnProperty.call(groupChild, "svg:rect")) {
      const svgRect = (groupChild as { "svg:rect"?: unknown })["svg:rect"];
      if (Array.isArray(svgRect)) {
        this.#_buildSceneElementsFromRect(groupChild);
      } else {
        this.#_buildSceneElementInRect(groupChild);
      }
    } else if (Object.prototype.hasOwnProperty.call(groupChild, "svg:g")) {
      this.#_buildSceneElements(groupChild);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #_buildSceneElementInRect = (rectObj: any): void => {
    const rect = new RectangleElement();
    rect.x = parseInt(rectObj["@_x"] as string);
    rect.y = parseInt(rectObj["@_y"] as string);
    rect.width = parseInt(rectObj["@_width"] as string);
    rect.height = parseInt(rectObj["@_height"] as string);
    rect.reactComponent = Rectangle;
    if (Object.prototype.hasOwnProperty.call(rectObj, "@_stroke-width")) {
      rect.strokeWidth = parseInt(rectObj["@_stroke-width"]);
    }
    if (Object.prototype.hasOwnProperty.call(rectObj, "@_stroke")) {
      rect.strokeColor = rectObj["@_stroke"] as string;
    }
    if (Object.prototype.hasOwnProperty.call(rectObj, "@_fill")) {
      rect.fillColor = rectObj["@_fill"] as string;
    }

    for (const [prop, value] of Object.entries(rectObj)) {
      let widgetElement: WidgetElement<SceneElementProps> | undefined =
        undefined;
      if (prop === "@_krb:class") {
        const krbClass = value as string;
        if (krbClass.toLowerCase() === "label") {
          widgetElement = this.#_buildLabelElement(
            rectObj,
            rect
          ) as WidgetElement<SceneElementProps>;
        } else if (krbClass.toLowerCase() === "displaycomponent") {
          const krbWidget = rectObj["@_krb:widget"] as string;
          if (krbWidget.toLowerCase() === "displaylabel") {
            widgetElement = this.#_buildDisplayLabelElement(
              rectObj,
              rect
            ) as WidgetElement<SceneElementProps>;
          } else if (krbWidget.toLowerCase() == "displaycommand") {
            widgetElement = this.#_buildDisplayCommandElement(
              rectObj,
              rect
            ) as WidgetElement<SceneElementProps>;
          } else if (krbWidget.toLowerCase() == "displaystatecolor") {
            widgetElement = this.#_buildDisplayStateColorElement(
              rectObj,
              rect
            ) as WidgetElement<SceneElementProps>;
          } else {
            // An unknown DisplayComponent widget - as a fallback render as a
            // static label.
            widgetElement = this.#_buildPlaceholderElement(
              rectObj,
              rect
            ) as WidgetElement<SceneElementProps>;
          }
        } else {
          // An unknown KrbClass type - as a fallback render as a label
          widgetElement = this.#_buildPlaceholderElement(
            rectObj,
            rect
          ) as WidgetElement<SceneElementProps>;
        }
        if (widgetElement !== undefined) {
          rect.widgets.push(widgetElement!);
        }
      }
    }
    this.#_elements.push(rect);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #_buildSceneElementsFromRect = (rectObj: any): void => {
    const rect = new RectangleElement();
    if (Object.prototype.hasOwnProperty.call(rectObj, "@_krb:x")) {
      rect.x = parseInt(rectObj["@_krb:x"] as string);
      rect.y = parseInt(rectObj["@_krb:y"] as string);
      rect.width = parseInt(rectObj["@_krb:width"] as string);
      rect.height = parseInt(rectObj["@_krb:height"] as string);
    } else {
      // TODO: Look for "isolated" rectangle attrs - a rectangle child with no "@_krb:class" attr.
      //       This occurs for instance in "agipd_control_mc.json". Also add support for borders
      //       in the Rectangle component. Move this to the end of the loop after all children have
      //       been reported. At that point, if no "isolated" rectangle attrs have been found,
      //       calculate the bounding rectangle for all the children and specify the rectangle
      //       size and position based on that.
      rect.x = 0;
      rect.y = 0;
      rect.width = this.#_width;
      rect.height = this.#_height;
    }
    rect.reactComponent = Rectangle;
    if (Object.prototype.hasOwnProperty.call(rectObj, "@_stroke-width")) {
      rect.strokeWidth = parseInt(rectObj["@_stroke-width"]);
    }
    if (Object.prototype.hasOwnProperty.call(rectObj, "@_stroke")) {
      rect.strokeColor = rectObj["@_stroke"] as string;
    }
    if (Object.prototype.hasOwnProperty.call(rectObj, "@_fill")) {
      rect.fillColor = rectObj["@_fill"] as string;
    }

    const arrayRoot = Object.prototype.hasOwnProperty.call(rectObj, "svg:rect")
      ? rectObj["svg:rect"]
      : rectObj;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (arrayRoot as object[]).forEach((rectChild: any) => {
      if (Object.prototype.hasOwnProperty.call(rectChild, "@_krb:class")) {
        let widgetElement: WidgetElement<SceneElementProps> | undefined =
          undefined;
        const krbClass = rectChild["@_krb:class"] as string;
        if (krbClass.toLowerCase() === "label") {
          widgetElement = this.#_buildLabelElement(
            rectChild,
            rect
          ) as WidgetElement<SceneElementProps>;
        } else if (krbClass.toLowerCase() === "displaycomponent") {
          const krbWidget = rectChild["@_krb:widget"] as string;
          if (krbWidget.toLowerCase() === "displaylabel") {
            widgetElement = this.#_buildDisplayLabelElement(
              rectChild,
              rect
            ) as WidgetElement<SceneElementProps>;
          } else if (krbWidget.toLowerCase() == "displaycommand") {
            widgetElement = this.#_buildDisplayCommandElement(
              rectChild,
              rect
            ) as WidgetElement<SceneElementProps>;
          } else if (krbWidget.toLowerCase() == "displaystatecolor") {
            widgetElement = this.#_buildDisplayStateColorElement(
              rectChild,
              rect
            ) as WidgetElement<SceneElementProps>;
          } else if (krbWidget.toLowerCase() === "displaytrendgraph") {
            widgetElement = this.#_buildDisplayTrendGraphElement(
              rectChild,
              rect
            ) as WidgetElement<SceneElementProps>;
          } else {
            // An unknown DisplayComponent widget - as a fallback render as a
            // static label.
            widgetElement = this.#_buildPlaceholderElement(
              rectChild,
              rect
            ) as WidgetElement<SceneElementProps>;
          }
        } else {
          // An unknown KrbClass type - as a fallback render as a label
          widgetElement = this.#_buildPlaceholderElement(
            rectChild,
            rect
          ) as WidgetElement<SceneElementProps>;
        }
        if (widgetElement !== undefined) {
          rect.widgets.push(widgetElement);
        }
      }
    });
    this.#_elements.push(rect);
  };

  #_buildLabelElement = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    labelObj: any,
    rect: RectangleElement
  ): LabelElement => {
    const labelWidget = new LabelElement();
    labelWidget.reactComponent = Label;
    labelWidget.x = parseInt(labelObj["@_x"] as string) - rect.x;
    labelWidget.y = parseInt(labelObj["@_y"] as string) - rect.y;
    labelWidget.width = parseInt(labelObj["@_width"] as string);
    labelWidget.height = parseInt(labelObj["@_height"] as string);
    labelWidget.text = labelObj["@_krb:text"] as string;
    if (Object.prototype.hasOwnProperty.call(labelObj, "@_krb:font")) {
      const fontDescriptor = new QtFontDescriptor(
        labelObj["@_krb:font"] as string
      );
      labelWidget.fontFamily = fontDescriptor.css_fontFamily;
      labelWidget.fontSize = fontDescriptor.css_fontSize;
      labelWidget.fontStyle = fontDescriptor.css_fontStyle;
      labelWidget.fontWeight = fontDescriptor.css_fontWeight;
      labelWidget.textDecoration = fontDescriptor.css_textDecoration;
    }
    if (Object.prototype.hasOwnProperty.call(labelObj, "@_krb:background")) {
      labelWidget.backgroundColor = labelObj["@_krb:background"] as string;
    }
    if (Object.prototype.hasOwnProperty.call(labelObj, "@_krb:foreground")) {
      labelWidget.foregroundColor = labelObj["@_krb:foreground"] as string;
    }
    if (Object.prototype.hasOwnProperty.call(labelObj, "@_krb:alignh")) {
      labelWidget.alignment = css_textAlign_for_KrbAlignh(
        parseInt(labelObj["@_krb:alignh"])
      );
    }
    if (Object.prototype.hasOwnProperty.call(labelObj, "@_krb:frameWidth")) {
      labelWidget.frameWidth = parseInt(labelObj["@_krb:frameWidth"] as string);
    }
    return labelWidget;
  };

  #_buildDisplayLabelElement = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispLabelObj: any,
    rect: RectangleElement
  ): DynamicWidgetElement<DynamicElementProps> => {
    const displayLabelElement = new DynamicWidgetElement<DynamicElementProps>();
    displayLabelElement.reactComponent = DisplayLabel;
    displayLabelElement.x = parseInt(dispLabelObj["@_x"] as string) - rect.x;
    displayLabelElement.y = parseInt(dispLabelObj["@_y"] as string) - rect.y;
    displayLabelElement.width = parseInt(dispLabelObj["@_width"] as string);
    displayLabelElement.height = parseInt(dispLabelObj["@_height"] as string);
    displayLabelElement.karaboKeys = dispLabelObj["@_krb:keys"] as string;
    if (Object.prototype.hasOwnProperty.call(dispLabelObj, "@_krb:fontSize")) {
      displayLabelElement.fontSize = parseInt(
        dispLabelObj["@_krb:fontSize"] as string
      );
    }
    if (
      Object.prototype.hasOwnProperty.call(dispLabelObj, "@_krb:font_weight")
    ) {
      displayLabelElement.fontWeight = (
        dispLabelObj["@_krb:font_weight"] as string
      ).toUpperCase() as "BOLD" | "NORMAL";
    }
    return displayLabelElement;
  };

  #_buildDisplayCommandElement = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispCommandObj: any,
    rect: RectangleElement
  ): DisplayCommandElement => {
    const displayCommandElement = new DisplayCommandElement();
    displayCommandElement.reactComponent = DisplayCommand;
    displayCommandElement.x =
      parseInt(dispCommandObj["@_x"] as string) - rect.x;
    displayCommandElement.y =
      parseInt(dispCommandObj["@_y"] as string) - rect.y;
    displayCommandElement.width = parseInt(dispCommandObj["@_width"] as string);
    displayCommandElement.height = parseInt(
      dispCommandObj["@_height"] as string
    );
    displayCommandElement.karaboKeys = dispCommandObj["@_krb:keys"] as string;
    displayCommandElement.requiresConfirmation = false;
    if (
      Object.prototype.hasOwnProperty.call(
        dispCommandObj,
        "@_krb:requires_confirmation"
      )
    ) {
      displayCommandElement.requiresConfirmation =
        (
          dispCommandObj["@_krb:requires_confirmation"] as string
        ).toLowerCase() === "true"
          ? true
          : false;
    }
    return displayCommandElement;
  };

  #_buildDisplayStateColorElement = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispStateColorObj: any,
    rect: RectangleElement
  ): DisplayStateColorElement => {
    const displayStateColorElement = new DisplayStateColorElement();
    displayStateColorElement.reactComponent = DisplayStateColor;
    displayStateColorElement.x =
      parseInt(dispStateColorObj["@_x"] as string) - rect.x;
    displayStateColorElement.y =
      parseInt(dispStateColorObj["@_y"] as string) - rect.y;
    displayStateColorElement.width = parseInt(
      dispStateColorObj["@_width"] as string
    );
    displayStateColorElement.height = parseInt(
      dispStateColorObj["@_height"] as string
    );
    displayStateColorElement.karaboKeys = dispStateColorObj[
      "@_krb:keys"
    ] as string;
    displayStateColorElement.showString = false;
    if (
      Object.prototype.hasOwnProperty.call(
        dispStateColorObj,
        "@_krb:show_string"
      )
    ) {
      displayStateColorElement.showString =
        (dispStateColorObj["@_krb:show_string"] as string).toLowerCase() ===
        "true"
          ? true
          : false;
    }
    return displayStateColorElement;
  };

  #_buildPlaceholderElement = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unhandledObj: any,
    rect: RectangleElement
  ): LabelElement => {
    const placeHolder = new LabelElement();
    placeHolder.reactComponent = Label;
    placeHolder.x = parseInt(unhandledObj["@_x"] as string) - rect.x;
    placeHolder.y = parseInt(unhandledObj["@_y"] as string) - rect.y;
    placeHolder.width = parseInt(unhandledObj["@_width"] as string);
    placeHolder.height = parseInt(unhandledObj["@_height"] as string);
    placeHolder.text = "??";
    placeHolder.alignment = "CENTER";
    placeHolder.foregroundColor = "#FF0000";
    placeHolder.frameWidth = 1;
    placeHolder.reactComponent = Label;
    return placeHolder;
  };

  #_buildDisplayTrendGraphElement = (
    displayTrendGraphObj: any,
    //It is a Rectangle element becos the bounding box is , svg:rect, it must return an element(class)
    rect: RectangleElement
  ): DisplayTrendGraphElement => {
    const trendGraphElement = new DisplayTrendGraphElement();
    trendGraphElement.reactComponent = DisplayTrendGraph;
    trendGraphElement.x =
      parseInt(displayTrendGraphObj["@_x"] as string) - rect.x;
    trendGraphElement.y =
      parseInt(displayTrendGraphObj["@_y"] as string) - rect.y;
    trendGraphElement.width = parseInt(
      displayTrendGraphObj["@_width"] as string
    );
    trendGraphElement.height = parseInt(
      displayTrendGraphObj["@_height"] as string
    );
    trendGraphElement.karaboKeys = displayTrendGraphObj["@_krb:keys"] as string;

    // Optional properties with defaults
    const bool = (v?: string) => v?.toLowerCase() === "true";
    const num = (v?: string) => parseFloat(v || "0");

    trendGraphElement.xLabel = displayTrendGraphObj["@_krb:x_label"] || "";
    trendGraphElement.yLabel = displayTrendGraphObj["@_krb:y_label"] || "";
    trendGraphElement.xUnits = displayTrendGraphObj["@_krb:x_units"] || "";
    trendGraphElement.yUnits = displayTrendGraphObj["@_krb:y_units"] || "";
    trendGraphElement.xGrid = bool(displayTrendGraphObj["@_krb:x_grid"]);
    trendGraphElement.yGrid = bool(displayTrendGraphObj["@_krb:y_grid"]);
    trendGraphElement.xLog = bool(displayTrendGraphObj["@_krb:x_log"]);
    trendGraphElement.yLog = bool(displayTrendGraphObj["@_krb:y_log"]);
    trendGraphElement.xInvert = bool(displayTrendGraphObj["@_krb:x_invert"]);
    trendGraphElement.yInvert = bool(displayTrendGraphObj["@_krb:y_invert"]);
    trendGraphElement.xMin = num(displayTrendGraphObj["@_krb:x_min"]);
    trendGraphElement.xMax = num(displayTrendGraphObj["@_krb:x_max"]);
    trendGraphElement.yMin = num(displayTrendGraphObj["@_krb:y_min"]);
    trendGraphElement.yMax = num(displayTrendGraphObj["@_krb:y_max"]);
    trendGraphElement.xAutorange = bool(
      displayTrendGraphObj["@_krb:x_autorange"]
    );
    trendGraphElement.yAutorange = bool(
      displayTrendGraphObj["@_krb:y_autorange"]
    );
    trendGraphElement.title = displayTrendGraphObj["@_krb:title"] || "";
    trendGraphElement.background =
      displayTrendGraphObj["@_krb:background"] || "transparent";

    return trendGraphElement;
  };

  // #endregion
}
