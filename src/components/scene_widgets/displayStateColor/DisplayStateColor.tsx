import * as React from "react";
import { Box, Typography } from "@mui/material";
import { DisplayStateColorElementProps } from "../../../karabo_data/SceneElements";
import { useAppSelector } from "../../../AppHooks";
import DeviceOfflineOverlay from "../DeviceOfflineOverlay";
import { useKaraboProperty } from "./hooks/useKaraboProperty";
import { useGuiStateColor } from "./hooks/useGuiStateColor";


//Totally inspired by the DisplayLabel widget this pattern is subject to debate

const DisplayStateColor: React.FC<DisplayStateColorElementProps> = (props) => {
  // topology to decide offline/online
  const topology = useAppSelector((s) => s.sysTopology.topology);
  const isOffline = props.isSrcDeviceOffline(topology);

  // subscribe to DEVICE/…/state and map it to a color
  const { value: rawStateUnknown } = useKaraboProperty(props.karaboKeys, "UNKNOWN");
  const rawState = String(rawStateUnknown);
  const { colorValue } = useGuiStateColor(rawState);

  //console.log(colorValue)

  return (
    <Box
      sx={{
        position: "absolute",
        left: props.x,
        top: props.y,
        width: props.width,
        height: props.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: props.fontSize,
        fontWeight: props.fontWeight.toLowerCase(),
        borderWidth: 1,
        borderStyle: "solid",
        p: "2px",
        overflow: "hidden",
        backgroundColor: colorValue,
      }}
    >
      {isOffline ? (
        <DeviceOfflineOverlay {...props} />
      ) : props.showString ? (
        <Typography variant="caption" sx={{ fontWeight: "inherit", fontSize: "inherit" }}>
          {rawState}
        </Typography>
      ) : null}
    </Box>
  );
};

export default DisplayStateColor;
