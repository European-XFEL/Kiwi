import React from "react";
import { Box } from "@mui/material";
import {
  RectangleElementProps,
  SceneElementProps,
  WidgetElement,
} from "../../karabo_data/SceneElements";

const Rectangle: React.FC<RectangleElementProps> = (props) => {
  const renderInternalWidgets = (
    widgets: WidgetElement<SceneElementProps>[]
  ) => {
    return (
      <React.Fragment>
        {widgets.map((widget: WidgetElement<SceneElementProps>) => {
          if (widget.reactComponent !== undefined) {
            return React.createElement(widget.reactComponent!, widget.props);
          }
        })}
      </React.Fragment>
    );
  };

  return (
    <Box
      sx={{
        position: "absolute",
        width: props.width,
        height: props.height,
        left: `${props.x}px`,
        top: `${props.y}px`,
        borderWidth: props.strokeWidth,
        borderColor: props.strokeColor,
        bgcolor: props.fillColor,
      }}
    >
      {renderInternalWidgets(props.widgets)}
    </Box>
  );
};

export default Rectangle;
