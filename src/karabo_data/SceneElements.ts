import { DeviceInfo, SystemTopologyInfo } from "./TopologyInfo";

export interface SceneElementProps {
  x: number;
  y: number;
  width: number;
  height: number;
  key: string;
}

export class SceneElement {
  x: number = 0;
  y: number = 0;
  width: number = 0;
  height: number = 0;
  key: string = `sceneElement_${crypto.randomUUID()}`;

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
  font: string;
  alignment: "LEFT" | "CENTER" | "RIGHT";
}

export class LabelElement extends WidgetElement<LabelElementProps> {
  text: string = "";
  backgroundColor: string = "#FFFFFF";
  foregroundColor: string = "#000000";
  frameWidth: number = 0;
  font: string = "Arial, 10";
  alignment: "LEFT" | "CENTER" | "RIGHT" = "LEFT";

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
  fontSize: number = 10;
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
