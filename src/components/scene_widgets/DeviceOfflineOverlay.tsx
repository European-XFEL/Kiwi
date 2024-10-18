import React from "react";
import { Box, Tooltip } from "@mui/material";
import CancelIcon from "@mui/icons-material/Cancel";
import { DynamicElementProps } from "../../karabo_data/SceneElements";

const DeviceOfflineOverlay: React.FC<DynamicElementProps> = (props) => {
  const deviceId = props.karaboKeys.slice(0, props.karaboKeys.indexOf("."));
  return (
    <Tooltip
      title={
        <React.Fragment>
          <b>{`${deviceId}`}</b>
          {" is offline"}
        </React.Fragment>
      }
      arrow
    >
      <Box
        sx={{
          position: "relative",
          display: "block",
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(255, 66, 66, 0.05)",
        }}
      >
        <CancelIcon
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            color: "#dd0000",
            fontSize: 18,
            fontWeight: "bold",
          }}
        />
      </Box>
    </Tooltip>
  );
};

export default DeviceOfflineOverlay;
