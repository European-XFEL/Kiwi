import * as React from "react";
import { DisplayStateColorElementProps } from "../../../karabo_data/SceneElements";
import DeviceOfflineOverlay from "../DeviceOfflineOverlay";
import { useKaraboPropertyInfo } from "../shared/hooks/useKaraboProperty";
import { useGuiStateColor } from "./hooks/useGuiStateColor";
import { splitKaraboKeys } from "../shared/helpers/splitKaraboKeys";
import { TopologyConnector } from "@/karabo_connectors/TopologyConnector";
import {
  DeviceInfo,
  TopologyEventType as TopologyEventType,
} from "@/karabo_data/TopologyInfo";

const DisplayStateColor: React.FC<DisplayStateColorElementProps> = React.memo(
  (props) => {
    const { deviceId } = React.useMemo(
      () => splitKaraboKeys(props.karaboKeys),
      [props.karaboKeys]
    );
    const [isOffline, setIsOffline] = React.useState<boolean>(
      !TopologyConnector.inst.isDeviceOnline(deviceId)
    );

    // Now returns full PropertyInfo or null
    const { property } = useKaraboPropertyInfo(props.karaboKeys);

    // Extract readable string state
    const rawState = property ? String(property.value) : "UNKNOWN";

    // Convert state string → GUI color
    const { colorValue } = useGuiStateColor(rawState);

    const onDeviceInfoUpdate = React.useCallback(
      (eventType: TopologyEventType, deviceInfo: DeviceInfo) => {
        if (deviceInfo.deviceId !== deviceId) {
          console.error(
            `Topology update routing error: monitor for ${deviceId} received update for ${deviceInfo.deviceId}!`
          );
        }
        setIsOffline(eventType === TopologyEventType.GONE);
      },
      [deviceId]
    );

    React.useEffect(() => {
      TopologyConnector.inst.registerDeviceInfoMonitor(
        deviceId,
        onDeviceInfoUpdate
      );
      return () => {
        TopologyConnector.inst.unregisterDeviceInfoMonitor(
          deviceId,
          onDeviceInfoUpdate
        );
      };
    }, [deviceId, onDeviceInfoUpdate]);

    return (
      <div
        className="absolute flex items-center justify-center border border-solid p-0.5 overflow-hidden"
        style={{
          left: props.x,
          top: props.y,
          width: props.width,
          height: props.height,
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: props.fontSize,
          fontWeight: props.fontWeight,
          backgroundColor: colorValue,
        }}
      >
        {isOffline ? (
          <DeviceOfflineOverlay {...props} />
        ) : props.showString ? (
          <span className="text-xs" aria-live="polite">
            {rawState}
          </span>
        ) : null}
      </div>
    );
  }
);

export default DisplayStateColor;
