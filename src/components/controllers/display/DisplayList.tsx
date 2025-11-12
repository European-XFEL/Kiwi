import React from "react";
import type { DisplayListProps } from "@/scene/scene_types/controllers/display";
import DeviceOfflineOverlay from "@/components/DeviceOfflineOverlay";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";
import { useDeviceOnlineStatus } from "@/components/shared/hooks/useDeviceOnlineStatus";
import { useKaraboPropertyInfo } from "@/components/shared/hooks/useKaraboProperty";
import { useKaraboKeysString } from "@/components/shared/hooks/useKaraboKeysString";

/**
 * DisplayList - Read-only display of array/list values.
 * Shows comma-separated values from VectorBinding properties.
 */
const DisplayList: React.FC<DisplayListProps> = (props) => {
  const keysStr = useKaraboKeysString(props.keys);
  const { deviceId, property } = useKaraboPropertyInfo(keysStr);
  const isOffline = useDeviceOnlineStatus(deviceId);

  // Format array value as comma-separated string
  const displayValue = React.useMemo(() => {
    if (!property) return "";
    const value = property.value ?? property.schemaAttrs?.defaultValue ?? [];

    if (Array.isArray(value)) {
      return value.join(", ");
    }

    return String(value);
  }, [property]);

  return (
    <div
      className="absolute overflow-clip flex items-center border border-solid px-1"
      style={{
        width: props.width,
        height: props.height,
        left: props.x,
        top: props.y,
        fontFamily: FONT_FAMILY_DEFAULT,
        fontSize: props.font_size,
        fontWeight: props.font_weight.toLowerCase(),
      }}
    >
      {isOffline ? (
        <DeviceOfflineOverlay
          keys={props.keys}
          x={props.x}
          y={props.y}
          width={props.width}
          height={props.height}
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
