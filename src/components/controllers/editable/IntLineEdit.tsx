import * as React from "react";
import type { IntLineEditProps } from "@/scene/scene_types/controllers";
import DeviceOfflineOverlay from "@/components/DeviceOfflineOverlay";
import { useKaraboPropertyInfo } from "@/components/shared/hooks/useKaraboProperty";
import { useDeviceOnlineStatus } from "@/components/shared/hooks/useDeviceOnlineStatus";
import { useKaraboKeysString } from "@/components/shared/hooks/useKaraboKeysString";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";

/**
 * IntLineEdit - Integer input field with validation.
 * Only accepts integer values.
 */
const IntLineEdit: React.FC<IntLineEditProps> = (props) => {
  const { keys, x, y, width, height, font_size, font_weight } = props;

  // Join keys for compatibility with hooks
  const joinedKeys = useKaraboKeysString(keys);
  const { deviceId, property } = useKaraboPropertyInfo(joinedKeys);
  const offline = useDeviceOnlineStatus(deviceId);

  const [value, setValue] = React.useState<string>("");

  // Get unit from property schema
  const unit = React.useMemo(() => {
    if (!property) return "";
    const prefix = property.schemaAttrs?.metricPrefixSymbol ?? "";
    const symbol = property.schemaAttrs?.unitSymbol ?? "";
    return `${prefix}${symbol}`.trim();
  }, [property]);

  // Sync with property changes
  React.useEffect(() => {
    if (!property) {
      setValue("");
      return;
    }
    const incoming = property.value ?? property.schemaAttrs?.defaultValue ?? 0;
    const intValue =
      typeof incoming === "number" ? incoming : parseInt(String(incoming), 10);
    if (!isNaN(intValue)) {
      setValue(String(intValue));
    }
  }, [property]);

  // Show offline overlay when device is not connected
  if (offline) {
    return (
      <DeviceOfflineOverlay
        keys={keys}
        x={x}
        y={y}
        width={width}
        height={height}
        key={`overlay-${joinedKeys}`}
      />
    );
  }

  return (
    <div
      className="absolute flex items-center"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        onBlur={(e) => {
          const intValue = parseInt(e.target.value, 10);
          if (!isNaN(intValue)) {
            setValue(String(intValue));
            // TODO: push value to backend or GUI server via WebSocket
          }
        }}
        className="border border-solid text-black rounded px-1 flex-1"
        style={{
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: font_size,
          fontWeight: font_weight.toLowerCase(),
          minWidth: 0,
        }}
        placeholder="0"
      />
      {unit && (
        <span
          className="ml-1 text-black"
          style={{
            fontFamily: FONT_FAMILY_DEFAULT,
            fontSize: font_size,
            fontWeight: font_weight.toLowerCase(),
          }}
        >
          {unit}
        </span>
      )}
    </div>
  );
};

export default IntLineEdit;
