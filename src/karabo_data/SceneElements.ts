import { DeviceInfo, SystemTopologyInfo } from "./TopologyInfo";
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
  isSrcDeviceOffline(topology: SystemTopologyInfo): boolean;
}

export class DynamicWidgetElement<
  PropsType extends DynamicElementProps
> extends WidgetElement<PropsType> {
  karaboKeys: string = "";
  fontSize: number = FONT_BASE_SIZE;
  fontWeight: "BOLD" | "NORMAL" = "NORMAL";

  /**
   * Checks if the source device associated with this element is offline
   * based on the provided system topology information.
   *
   * @param topology - The system topology information to check against.
   * @returns `true` if the source device is offline, `false` otherwise.
   */
  isSrcDeviceOffline = (topology: SystemTopologyInfo) => {
    const deviceId =
      this.karaboKeys.indexOf(".") > 0
        ? this.karaboKeys.slice(0, this.karaboKeys.indexOf("."))
        : "";
    if (deviceId.length < 1) {
      // No defined source device is considered "online"
      return false;
    }
    const deviceIdx = topology.devices.findIndex((value: DeviceInfo) => {
      return value.deviceId === deviceId;
    });
    return deviceIdx < 0; // findIndex returned -1; device not in topology
  };

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
