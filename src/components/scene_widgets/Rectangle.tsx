import React from "react";
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
        {widgets.map(
          (widget: WidgetElement<SceneElementProps>, idx: number) => {
            if (widget.reactComponent !== undefined) {
              const { key, ...restProps } = widget.props as any;
              return React.createElement(widget.reactComponent!, {
                key: `rect_widget_${idx}`,
                ...restProps,
              });
            }
            return null;
          }
        )}
      </React.Fragment>
    );
  };

  return (
    <div
      className="absolute border-solid"
      style={{
        width: props.width,
        height: props.height,
        left: `${props.x}px`,
        top: `${props.y}px`,
        borderWidth: props.strokeWidth,
        borderColor: props.strokeColor,
        backgroundColor: props.fillColor,
      }}
    >
      {renderInternalWidgets(props.widgets)}
    </div>
  );
};

export default Rectangle;
