import React from "react";
import { DynamicElementProps } from "../../karabo_data/SceneElements";
import DeviceOfflineOverlay from "./DeviceOfflineOverlay";
import useSystemTopologyStore from "../../store/systemTopologyStore";
import { DevicePropertyConnector } from "../../karabo_connectors/DevicePropertyConnector";
import { splitKaraboKeys } from "./shared/helpers/splitKaraboKeys";
import { FONT_FAMILY_DEFAULT } from "./shared/helpers/QtFontDescriptor";

const DisplayLabel: React.FC<DynamicElementProps> = (props) => {
  const topology = useSystemTopologyStore((state) => state.topology);

  const [labelValue, setLabelValue] = React.useState<string>("");

  const { deviceId, propertyId } = React.useMemo(
    () => splitKaraboKeys(props.karaboKeys),
    [props.karaboKeys]
  );

  // Handler for device property updates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onPropertyUpdate = (updatedValue: any) => {
    setLabelValue(updatedValue.toString());
  };

  // Register the component as a property updater when it is added to the DOM
  // and unregister when it is removed from the DOM
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
  }, [deviceId, propertyId]);

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
        labelValue
      )}
    </div>
  );
};

export default DisplayLabel;
