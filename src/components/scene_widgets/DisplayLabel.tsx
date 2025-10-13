import React from "react";
import { DynamicElementProps } from "@/karabo_data/SceneElements";
import DeviceOfflineOverlay from "@/components/scene_widgets/DeviceOfflineOverlay";
import useSystemTopologyStore from "@/store/systemTopologyStore";
import { DevicePropertyConnector } from "@/karabo_connectors/DevicePropertyConnector";
import { DeviceSchemaConnector } from "@/karabo_connectors/DeviceSchemaConnector";
import { splitKaraboKeys } from "./shared/helpers/splitKaraboKeys";
import { FONT_FAMILY_DEFAULT } from "./shared/helpers/QtFontDescriptor";
import { DeviceSchemaInfo } from "@/karabo_data/DeviceSchemaInfo";
import { PropertyInfo } from "@/karabo_data/DeviceConfigInfo";
import { HashTypes } from "karabo-ts";

const DisplayLabel: React.FC<DynamicElementProps> = (props) => {
  const topology = useSystemTopologyStore((state) => state.topology);

  const [labelValue, setLabelValue] = React.useState<string>("");
  const [labelUnit, setLabelUnit] = React.useState<string>("");

  const { deviceId, propertyId } = React.useMemo(
    () => splitKaraboKeys(props.karaboKeys),
    [props.karaboKeys]
  );

  const onPropertyUpdate = (updatedProperty: PropertyInfo) => {
    const propType = updatedProperty.propertyType;
    if (propType === HashTypes.Float32 || propType === HashTypes.Float64) {
      const num = Number(updatedProperty.propertyValue);
      // Note: parseFloat removes the trailing zeros after the decimal point
      setLabelValue(
        isNaN(num) ? "" : parseFloat(num.toPrecision(8)).toString()
      );
      return;
    }
    setLabelValue(updatedProperty.propertyValue.toString());
  };

  const onSchemaUpdate = React.useCallback(
    (deviceSchema: DeviceSchemaInfo) => {
      if (deviceSchema.deviceId === deviceId) {
        let unit = "";
        const propAttrs = deviceSchema.propertyDescriptors.get(propertyId);
        if (propAttrs !== undefined) {
          if (propAttrs.metricPrefixSymbol !== undefined) {
            unit = propAttrs.metricPrefixSymbol;
          }
          if (propAttrs.unitSymbol !== undefined) {
            unit = `${unit}${propAttrs.unitSymbol}`;
          }
        }
        setLabelUnit(unit);
      }
    },
    [deviceId, propertyId]
  );

  // Register the component as a property and schema updater when it is added
  // to the DOM and unregister when it is removed from the DOM
  React.useEffect(() => {
    DeviceSchemaConnector.inst.registerSchemaMonitor(deviceId, onSchemaUpdate);
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
      DeviceSchemaConnector.inst.unregisterSchemaMonitor(
        deviceId,
        onSchemaUpdate
      );
    };
  }, [deviceId, propertyId, onSchemaUpdate]);

  return (
    <div
      className="absolute overflow-clip flex items-center justify-center border border-solid p-px"
      style={{
        width: `${props.width}px`,
        height: `${props.height}px`,
        left: `${props.x}px`,
        top: `${props.y}px`,
        fontFamily: FONT_FAMILY_DEFAULT,
        fontSize: props.fontSize,
        fontWeight: props.fontWeight.toLowerCase(),
      }}
    >
      {props.isSrcDeviceOffline(topology) ? (
        <DeviceOfflineOverlay {...props} />
      ) : (
        `${labelValue} ${labelUnit}`
      )}
    </div>
  );
};

export default DisplayLabel;
