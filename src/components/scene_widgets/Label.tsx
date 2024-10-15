import React from "react";
import { Box } from "@mui/material";
import { LabelElementProps } from "../../karabo_data/SceneElements";

const Label: React.FC<LabelElementProps> = (props) => {
  return (
    <Box
      sx={{
        position: "absolute",
        width: `${props.width}px`,
        height: `${props.height}px`,
        left: `${props.x}px`,
        top: `${props.y}px`,
        borderWidth: props.frameWidth,
        borderColor: props.foregroundColor,
        borderStyle: "solid",
        color: props.foregroundColor,
        bgcolor: props.backgroundColor,
        // font: props.font,
        fontFamily: "Arial, Helvetica, Sans-serif",
        fontSize: 12,
        textAlign: props.alignment.toLowerCase(),
        p: "2px",
      }}
    >
      {props.text}
    </Box>
  );
};

export default Label;
