import * as React from "react";
import { DisplayStateColorElementProps } from "../../../karabo_data/SceneElements";
import useSystemTopologyStore from "../../../store/systemTopologyStore";
import DeviceOfflineOverlay from "../DeviceOfflineOverlay";
import { useKaraboPropertyInfo } from "../shared/hooks/useKaraboProperty";
import { useGuiStateColor } from "./hooks/useGuiStateColor";

const DisplayStateColor: React.FC<DisplayStateColorElementProps> = React.memo(
  (props) => {
    const topology = useSystemTopologyStore((state) => state.topology);
    const isOffline = props.isSrcDeviceOffline(topology);

    // Now returns full PropertyInfo or null
    const { property } = useKaraboPropertyInfo(props.karaboKeys);

    // Extract readable string state
    const rawState = property ? String(property.propertyValue) : "UNKNOWN";

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
