import React from "react";
import type { DisplayCheckBoxProps } from "@/scene/scene_types/controllers";
import { useKaraboPropertyInfo } from "../../shared/hooks/useKaraboProperty";
import { useDeviceOnlineStatus } from "../../shared/hooks/useDeviceOnlineStatus";
import { useKaraboKeysString } from "../../shared/hooks/useKaraboKeysString";
import { Checkbox } from "../../ui/checkbox";
import DeviceOfflineOverlay from "../../DeviceOfflineOverlay";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";

const DisplayCheckbox: React.FC<DisplayCheckBoxProps> = ({
  keys,
  x,
  y,
  width,
  height,
  font_size,
  font_weight,
}) => {
  const keysStr = useKaraboKeysString(keys);
  const { deviceId, property } = useKaraboPropertyInfo(keysStr);
  const isOffline = useDeviceOnlineStatus(deviceId);

  const isChecked = React.useMemo(() => {
    const value = property?.value;
    if (typeof value === "boolean") return value;
    if (typeof value === "string")
      return value.toLowerCase() === "true" || value === "1";
    if (typeof value === "number") return value !== 0;
    return false;
  }, [property?.value]);

  if (isOffline) {
    return (
      <DeviceOfflineOverlay
        keys={keys}
        x={x}
        y={y}
        width={width}
        height={height}
      />
    );
  }

  const boxSize = Math.min(width, height, 18);

  return (
    <div
      className="absolute flex items-center justify-center"
      style={{
        left: x,
        top: y,
        width,
        height,
        fontFamily: FONT_FAMILY_DEFAULT,
        fontSize: font_size,
        fontWeight: font_weight,
      }}
    >
      <Checkbox
        checked={isChecked}
        disabled
        aria-label={`Display checkbox for ${keys.join(", ")}`}
        aria-readonly="true"
        className="
          border
          border-gray-700
          rounded-none
          data-[state=checked]:bg-white
          data-[state=checked]:text-black
          data-[state=checked]:border-black
        "
        style={{
          width: boxSize,
          height: boxSize,
        }}
      />
    </div>
  );
};

export default DisplayCheckbox;
