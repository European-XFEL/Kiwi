import React from "react";
import type { DisplayLabelProps } from "../../../scene/scene_types/controllers/display";
import DeviceOfflineOverlay from "@/components/DeviceOfflineOverlay";
import { FONT_FAMILY_DEFAULT } from "../../shared/helpers/fontDefaults";
import { HashTypes } from "karabo-ts";
import { useDeviceOnlineStatus } from "../../shared/hooks/useDeviceOnlineStatus";
import { useKaraboPropertyInfo } from "../../shared/hooks/useKaraboProperty";
import { useKaraboKeysString } from "../../shared/hooks/useKaraboKeysString";
import type { PropertyInfo } from "@/karabo_data/DeviceConfigInfo";

const DisplayLabel: React.FC<DisplayLabelProps> = (props) => {
  const { keys, x, y, width, height, font_size, font_weight } = props;

  const keysStr = useKaraboKeysString(keys);
  const { deviceId, property } = useKaraboPropertyInfo(keysStr);
  const isOffline = useDeviceOnlineStatus(deviceId);

  // Narrow to the scalar PropertyInfo type this widget expects
  const typedProperty = property as PropertyInfo | null;

  const labelValue = React.useMemo(() => {
    if (!typedProperty) return "";

    const prefix = typedProperty.schemaAttrs?.metricPrefixSymbol ?? "";
    const symbol = typedProperty.schemaAttrs?.unitSymbol ?? "";
    const displayUnit = `${prefix}${symbol}`.trim();
    const propType = typedProperty.type;

    // Float types: format nicely with limited precision
    if (propType === HashTypes.Float32 || propType === HashTypes.Float64) {
      const num = Number(typedProperty.value);
      const displayValue = Number.isNaN(num)
        ? String(typedProperty.value)
        : parseFloat(num.toPrecision(8)).toString();

      return displayUnit ? `${displayValue} ${displayUnit}` : displayValue;
    }

    // Non-float types: just show string representation
    const raw = String(typedProperty.value);
    return displayUnit ? `${raw} ${displayUnit}` : raw;
  }, [typedProperty]);

  return (
    <div
      className="absolute overflow-clip flex items-center justify-center border border-solid p-px"
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
        labelValue
      )}
    </div>
  );
};

export default DisplayLabel;
