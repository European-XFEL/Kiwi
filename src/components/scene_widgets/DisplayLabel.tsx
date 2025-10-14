import React from "react";
import { DynamicElementProps } from "@/karabo_data/SceneElements";
import DeviceOfflineOverlay from "@/components/scene_widgets/DeviceOfflineOverlay";
import { DevicePropertyConnector } from "@/karabo_connectors/DevicePropertyConnector";
import { splitKaraboKeys } from "./shared/helpers/splitKaraboKeys";
import { FONT_FAMILY_DEFAULT } from "./shared/helpers/QtFontDescriptor";
import { PropertyInfo } from "@/karabo_data/DeviceConfigInfo";
import { HashTypes } from "karabo-ts";
import { TopologyConnector } from "@/karabo_connectors/TopologyConnector";
import { DeviceInfo } from "@/karabo_data/TopologyInfo";
import { useKaraboSchema } from "./shared/hooks/useKaraboSchema";

const DisplayLabel: React.FC<DynamicElementProps> = (props) => {
  const { deviceId, propertyId } = React.useMemo(
    () => splitKaraboKeys(props.karaboKeys),
    [props.karaboKeys]
  );
  const [labelValue, setLabelValue] = React.useState<string>("");
  const [isOffline, setIsOffline] = React.useState<boolean>(
    !TopologyConnector.inst.isDeviceOnline(deviceId)
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

  const onDeviceInfoUpdate = React.useCallback(
    (updateInfo?: DeviceInfo) => {
      if (updateInfo !== undefined && updateInfo!.deviceId !== deviceId) {
        console.error(
          `Topology update routing error: monitor for ${deviceId} received update for ${
            updateInfo!.deviceId
          }!`
        );
      }
      setIsOffline(updateInfo === undefined);
    },
    [deviceId]
  );

  // Register the component as a property and schema updater when it is added
  // to the DOM and unregister when it is removed from the DOM
  React.useEffect(() => {
    TopologyConnector.inst.registerDeviceInfoMonitor(
      deviceId,
      onDeviceInfoUpdate
    );
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
      TopologyConnector.inst.unregisterDeviceInfoMonitor(
        deviceId,
        onDeviceInfoUpdate
      );
    };
  }, [deviceId, propertyId, onDeviceInfoUpdate, onPropertyUpdate]);

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
