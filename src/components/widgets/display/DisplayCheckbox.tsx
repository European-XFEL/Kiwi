import React from "react";
import type { DisplayCheckBoxElementProps } from "@/karabo_data/SceneElements";
import { useKaraboPropertyInfo } from "../shared/hooks/useKaraboProperty";
import { useDeviceOnlineStatus } from "../shared/hooks/useDeviceOnlineStatus";
import { Checkbox } from "../../ui/checkbox";
import DeviceOfflineOverlay from "../simple/DeviceOfflineOverlay";

export const DisplayCheckbox: React.FC<DisplayCheckBoxElementProps> = (
  props
) => {
  const { deviceId, property } = useKaraboPropertyInfo(props.karaboKeys);
  const isOffline = useDeviceOnlineStatus(deviceId);

  // Convert property value to boolean
  const isChecked = React.useMemo(() => {
    if (!property) return false;
    const value = property.value;

    // Handle various boolean representations
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      return value.toLowerCase() === "true" || value === "1";
    }
    if (typeof value === "number") return value !== 0;

    return false;
  }, [property]);

  return (
    <div
      className="absolute flex items-center justify-center"
      style={{
        left: props.x,
        top: props.y,
        width: props.width,
        height: props.height,
      }}
    >
      {isOffline ? (
        <DeviceOfflineOverlay {...props} />
      ) : (
        <Checkbox
          checked={isChecked}
          disabled
          aria-label={`Display CheckBox for ${props.karaboKeys}`}
          aria-readonly="true"
          className="border-2 border-gray-700 data-[state=checked]:bg-white data-[state=checked]:text-black data-[state=checked]:border-black"
        />
      )}
    </div>
  );
};
