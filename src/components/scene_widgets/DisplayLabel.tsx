import React from "react";
import { Box } from "@mui/material";
import { DynamicElementProps } from "../../karabo_data/SceneElements";
import DeviceOfflineOverlay from "./DeviceOfflineOverlay";
import { useAppSelector } from "../../AppHooks";

const DisplayLabel: React.FC<DynamicElementProps> = (props) => {
  // TODO: do the data binding - for now only display the karaboKeys
  const sysTopologyState = useAppSelector((state) => state.sysTopology);
  return (
    <Box
      sx={{
        position: "absolute",
        width: `${props.width}px`,
        height: `${props.height}px`,
        left: `${props.x}px`,
        top: `${props.y}px`,
        overflow: "clip",
        // fontSize: props.fontSize,
        // fontWeight: props.fontWeight,
        fontFamily: "Arial, Helvetica, Sans-serif",
        fontSize: 12,
        fontWeight: props.fontWeight.toLowerCase(),
        borderWidth: 1,
        borderStyle: "solid",
        p: "1px",
      }}
    >
      {props.isSrcDeviceOffline(sysTopologyState.topology) ? (
        <DeviceOfflineOverlay {...props} />
      ) : (
        props.karaboKeys.slice(props.karaboKeys.lastIndexOf(".") + 1)
      )}
    </Box>
  );
};
export default DisplayLabel;
