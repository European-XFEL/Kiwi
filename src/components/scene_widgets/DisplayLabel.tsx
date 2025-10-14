import React from "react";
import { DynamicElementProps } from "@/karabo_data/SceneElements";
import DeviceOfflineOverlay from "@/components/scene_widgets/DeviceOfflineOverlay";
import useSystemTopologyStore from "@/store/systemTopologyStore";
import { DevicePropertyConnector } from "@/karabo_connectors/DevicePropertyConnector";
import { PropertyInfo } from "@/karabo_data/DeviceConfigInfo";
import { HashTypes } from "karabo-ts";
import { FONT_FAMILY_DEFAULT } from "./shared/helpers/QtFontDescriptor";
import { useKaraboSchema } from "./shared/hooks/useKaraboSchema";
import { splitKaraboKeys } from "./shared/helpers/splitKaraboKeys";

const DisplayLabel: React.FC<DynamicElementProps> = (props) => {
  const topology = useSystemTopologyStore((state) => state.topology);
  const isOffline = props.isSrcDeviceOffline(topology);

  const [labelValue, setLabelValue] = React.useState<string>("");

  const { deviceId, propertyId } = React.useMemo(
    () => splitKaraboKeys(props.karaboKeys),
    [props.karaboKeys]
  );

  const { propertyDescriptor } = useKaraboSchema(props.karaboKeys);

  const unit = React.useMemo(() => {
    if (!propertyDescriptor) return "";
    const prefix = propertyDescriptor.metricPrefixSymbol ?? "";
    const symbol = propertyDescriptor.unitSymbol ?? "";
    return `${prefix}${symbol}`;
  }, [propertyDescriptor]);

  const onPropertyUpdate = React.useCallback(
    (updatedProperty: PropertyInfo) => {
      const propType = updatedProperty.propertyType;

      if (propType === HashTypes.Float32 || propType === HashTypes.Float64) {
        const num = Number(updatedProperty.propertyValue);
        const displayValue = Number.isNaN(num)
          ? String(updatedProperty.propertyValue)
          : parseFloat(num.toPrecision(8)).toString();

        setLabelValue(displayValue);
        return;
      }

      // For all non-float types, show the string representation directly
      setLabelValue(String(updatedProperty.propertyValue));
    },
    []
  );

  React.useEffect(() => {
    DevicePropertyConnector.inst.registerPropertyMonitor(
      deviceId,
      propertyId,
      onPropertyUpdate
    );
    return () => {
      DevicePropertyConnector.inst.unregisterPropertyMonitor(
        deviceId,
        propertyId,
        onPropertyUpdate
      );
    };
  }, [deviceId, propertyId, onPropertyUpdate]);

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
      {isOffline ? (
        <DeviceOfflineOverlay {...props} />
      ) : (
        `${labelValue} ${unit}`
      )}
    </div>
  );
};

export default DisplayLabel;
