import React from "react";
import { Box } from "@mui/material";
import { DynamicElementProps } from "../../karabo_data/SceneElements";

const DisplayLabel: React.FC<DynamicElementProps> = (props) => {
  // TODO: do the data binding - for now only display the karaboKeys
  return (
    <Box
      sx={{
        position: "absolute",
        width: `${props.width}px`,
        height: `${props.height}px`,
        left: `${props.x}px`,
        top: `${props.y}px`,
        // fontSize: props.fontSize,
        // fontWeight: props.fontWeight,
        fontFamily: "Arial, Helvetica, Sans-serif",
        fontSize: 12,
        fontWeight: props.fontWeight.toLowerCase(),
        borderWidth: 1,
        borderStyle: "solid",
        p: "2px",
      }}
    >
      {props.karaboKeys}
    </Box>
  );
};

export default DisplayLabel;
