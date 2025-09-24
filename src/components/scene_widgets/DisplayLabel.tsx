import React from "react";
import { Box } from "@mui/material";
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
    setLabelValue(updatedValue);
  };

  // Register the component as a property updater when it is added to the DOM
  // and unregister when it is removed from the DOM
  React.useEffect(
    () => {
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
    },
    // Only registers/unregister if either the deviceId or propertyId changes
    [deviceId, propertyId]
  );

  return (
    <Box
      sx={{
        position: "absolute",
        width: `${props.width}px`,
        height: `${props.height}px`,
        left: `${props.x}px`,
        top: `${props.y}px`,
        overflow: "clip",
        fontFamily: FONT_FAMILY_DEFAULT,
        fontSize: props.fontSize,
        fontWeight: props.fontWeight.toLowerCase(),
        borderWidth: 1,
        borderStyle: "solid",
        p: "1px",
      }}
    >
      {props.isSrcDeviceOffline(topology) ? (
        <DeviceOfflineOverlay {...props} />
      ) : (
        labelValue
      )}
    </Box>
  );
};

export default DisplayLabel;
