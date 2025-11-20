import React from "react";
import type { DisplayListProps } from "@/scene/scene_types/controllers/display";
import DeviceOfflineOverlay from "@/components/DeviceOfflineOverlay";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";
import { useDeviceOnlineStatus } from "@/components/shared/hooks/useDeviceOnlineStatus";
import { useKaraboPropertyInfo } from "@/components/shared/hooks/useKaraboProperty";
import { useKaraboKeysString } from "@/components/shared/hooks/useKaraboKeysString";
import type { PropertyInfo } from "@/karabo_data/DeviceConfigInfo";

/**
 * DisplayList - Read-only display of array/list values.
 * Shows comma-separated values from VectorBinding properties.
 */
const DisplayList: React.FC<DisplayListProps> = (props) => {
  const { keys, x, y, width, height, font_size, font_weight } = props;

  const keysStr = useKaraboKeysString(keys);
  const { deviceId, property } = useKaraboPropertyInfo(keysStr);
  const isOffline = useDeviceOnlineStatus(deviceId);

  // Narrow to the scalar PropertyInfo type this widget expects
  const typedProperty = property as PropertyInfo | null;

  // Format array value as comma-separated string
  const displayValue = React.useMemo(() => {
    if (!typedProperty) return "";

    const value =
      typedProperty.value ?? typedProperty.schemaAttrs?.defaultValue ?? [];

    if (Array.isArray(value)) {
      return value.join(", ");
    }

    return String(value);
  }, [typedProperty]);

  return (
    <div
      className="absolute overflow-clip flex items-center border border-solid px-1"
      style={{
        width,
        height,
        left: x,
        top: y,
        fontFamily: FONT_FAMILY_DEFAULT,
        fontSize: font_size,
        fontWeight: font_weight.toLowerCase(),
      }}
    >
      {isOffline ? (
        <DeviceOfflineOverlay
          keys={keys}
          x={x}
          y={y}
          width={width}
          height={height}
        />
      ) : (
        <span
          style={{
            width: "100%",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            display: "block",
          }}
        >
          {displayValue}
        </span>
      )}
    </div>
  );
};

export default DisplayList;
