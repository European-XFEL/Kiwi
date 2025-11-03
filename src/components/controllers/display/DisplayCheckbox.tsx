import React from "react";
import type { DisplayCheckBoxProps } from "@/scene/scene_types/controllers";
import { useKaraboPropertyInfo } from "../../shared/hooks/useKaraboProperty";
import { useDeviceOnlineStatus } from "../../shared/hooks/useDeviceOnlineStatus";
import { useKaraboKeysString } from "../../shared/hooks/useKaraboKeysString";
import { Checkbox } from "../../ui/checkbox";
import DeviceOfflineOverlay from "../../DeviceOfflineOverlay";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/QtFontDescriptor";

/**
 * DisplayCheckbox (read-only)
 * Renders a disabled checkbox reflecting the bound property value.
 */
const DisplayCheckbox: React.FC<DisplayCheckBoxProps> = ({
  keys,
  x,
  y,
  width,
  height,
  font_size,
  font_weight,
}) => {
  // Combine keys into a comma-separated string for Karabo hooks
  const keysStr = useKaraboKeysString(keys);

  const { deviceId, property } = useKaraboPropertyInfo(keysStr);
  const isOffline = useDeviceOnlineStatus(deviceId);

  // Normalize property value → boolean
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

  return (
    <Checkbox
      checked={isChecked}
      disabled
      aria-label={`Display checkbox for ${keys.join(", ")}`}
      aria-readonly="true"
      className="absolute border-2 border-gray-700 data-[state=checked]:bg-white data-[state=checked]:text-black data-[state=checked]:border-black"
      style={{
        left: x,
        top: y,
        width,
        height,
        fontFamily: FONT_FAMILY_DEFAULT,
        fontSize: font_size,
        fontWeight: font_weight,
      }}
    />
  );
};

export default DisplayCheckbox;
