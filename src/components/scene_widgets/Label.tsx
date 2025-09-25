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
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        fontFamily: props.fontFamily,
        fontSize: props.fontSize,
        fontWeight: props.fontWeight,
        fontStyle: props.fontStyle,
        textDecoration: props.textDecoration,
        textAlign: props.alignment.toLowerCase(),
        p: "2px",
      }}
    >
      {props.text}
    </Box>
  );
};

export default Label;
