import React from "react";
import { DynamicElementProps } from "@/karabo_data/SceneElements";
import DeviceOfflineOverlay from "@/components/DeviceOfflineOverlay";
import { FONT_FAMILY_DEFAULT } from "../../shared/helpers/QtFontDescriptor";
import { HashTypes } from "karabo-ts";
import { useDeviceOnlineStatus } from "../../shared/hooks/useDeviceOnlineStatus";
import { useKaraboPropertyInfo } from "../../shared/hooks/useKaraboProperty";

const DisplayLabel: React.FC<DynamicElementProps> = (props) => {
  //hooks
  const { deviceId, property } = useKaraboPropertyInfo(props.karaboKeys);
  const isOffline = useDeviceOnlineStatus(deviceId);

  //value and unit
  const labelValue = React.useMemo(() => {
    if (!property) return "";
    const prefix = property.schemaAttrs?.metricPrefixSymbol ?? "";
    const symbol = property.schemaAttrs?.unitSymbol ?? "";
    const displayUnit = `${prefix}${symbol}`;
    const propType = property.type;

    if (propType === HashTypes.Float32 || propType === HashTypes.Float64) {
      const num = Number(property.value);
      const displayValue = Number.isNaN(num)
        ? String(property.value)
        : parseFloat(num.toPrecision(8)).toString();

      return `${displayValue} ${displayUnit}`;
    }

    // For all non-float types, show the string representation directly
    return `${String(property.value)} ${displayUnit}`;
  }, [property]);

  return (
    <div
      className="absolute overflow-clip flex items-center justify-center border border-solid p-px"
      style={{
        width: props.width,
        height: props.height,
        left: props.x,
        top: props.y,
        fontFamily: FONT_FAMILY_DEFAULT,
        fontSize: props.fontSize,
        fontWeight: props.fontWeight.toLowerCase(),
      }}
    >
      {isOffline ? <DeviceOfflineOverlay {...props} /> : `${labelValue}`}
    </div>
  );
};

export default DisplayLabel;
