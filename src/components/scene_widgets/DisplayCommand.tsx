import React from "react";
import { Button } from "@mui/material";
import { DisplayCommandElementProps } from "../../karabo_data/SceneElements";

const DisplayCommand: React.FC<DisplayCommandElementProps> = (props) => {
  // TODO: retrieve the button label from the slot display name and call the
  //       command on button click
  return (
    <Button
      size="small"
      variant="contained"
      sx={{
        position: "absolute",
        width: `${props.width}px`,
        height: `${props.height}px`,
        left: `${props.x}px`,
        top: `${props.y}px`,
        fontFamily: "Arial, Helvetica, Sans-serif",
        fontSize: 11,
        fontWeight: "bolder",
      }}
    >
      {props.karaboKeys.substring(props.karaboKeys.lastIndexOf(".") + 1)}
    </Button>
  );
};

export default DisplayCommand;
