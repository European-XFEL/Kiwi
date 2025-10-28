import * as React from "react";
import { DisplayStateColorElementProps } from "../../../karabo_data/SceneElements";
import DeviceOfflineOverlay from "../simple/DeviceOfflineOverlay";
import { useKaraboPropertyInfo } from "../shared/hooks/useKaraboProperty";
import { useGuiStateColor } from "../shared/hooks/useGuiStateColor";
import { useDeviceOnlineStatus } from "../shared/hooks/useDeviceOnlineStatus";
import { splitKaraboKeys } from "../shared/helpers/splitKaraboKeys";

const DisplayStateColor: React.FC<DisplayStateColorElementProps> = React.memo(
  (props) => {
    const { deviceId } = React.useMemo(
      () => splitKaraboKeys(props.karaboKeys),
      [props.karaboKeys]
    );
    const isOffline = useDeviceOnlineStatus(deviceId);

    // Now returns full PropertyInfo or null
    const { property } = useKaraboPropertyInfo(props.karaboKeys);

    // Extract readable string state
    const rawState = property ? String(property.value) : "UNKNOWN";

    // Convert state string → GUI color
    const { colorValue } = useGuiStateColor(rawState);

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
