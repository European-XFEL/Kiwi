import React from "react";
import type { DisplayStateColorProps } from "@/scene/scene_types/controllers";
import DeviceOfflineOverlay from "../../DeviceOfflineOverlay";
import { useKaraboPropertyInfo } from "../../shared/hooks/useKaraboProperty";
import { useGuiStateColor } from "../../shared/hooks/useGuiStateColor";
import { useDeviceOnlineStatus } from "../../shared/hooks/useDeviceOnlineStatus";
import { useKaraboKeysString } from "../../shared/hooks/useKaraboKeysString";

/**
 * DisplayStateColor (read-only)
 * Renders a colored box reflecting the device state, optionally showing text.
 */
const DisplayStateColor: React.FC<DisplayStateColorProps> = React.memo(
  ({ keys, x, y, width, height, font_size, font_weight, show_string }) => {
    // Join keys for Karabo hook
    const keysStr = useKaraboKeysString(keys);

    const { deviceId, property } = useKaraboPropertyInfo(keysStr);
    const isOffline = useDeviceOnlineStatus(deviceId);

    // Normalize property value to string and derive GUI color
    const rawState = React.useMemo(
      () => String(property?.value ?? "UNKNOWN"),
      [property?.value]
    );
    const { colorValue } = useGuiStateColor(rawState);

    // Render offline overlay when disconnected
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
      <div
        className="absolute flex items-center justify-center border border-solid overflow-hidden p-0.5"
        style={{
          left: x,
          top: y,
          width,
          height,
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: font_size,
          fontWeight: font_weight,
          backgroundColor: colorValue,
        }}
        aria-label={`Display state color for ${keys.join(", ")}`}
      >
        {show_string && (
          <span className="text-xs" aria-live="polite">
            {rawState}
          </span>
        )}
      </div>
    );
  }
);

export default DisplayStateColor;
