import React from "react";
import { LabelElementProps } from "../../karabo_data/SceneElements";

const Label: React.FC<LabelElementProps> = (props) => {
  return (
    <div
      className="absolute overflow-hidden text-ellipsis whitespace-nowrap border-solid p-0.5"
      style={{
        width: `${props.width}px`,
        height: `${props.height}px`,
        left: `${props.x}px`,
        top: `${props.y}px`,
        borderWidth: props.frameWidth,
        borderColor: props.foregroundColor,
        color: props.foregroundColor,
        backgroundColor: props.backgroundColor,
        fontFamily: props.fontFamily,
        fontSize: props.fontSize,
        fontWeight: props.fontWeight,
        fontStyle: props.fontStyle,
        textDecoration: props.textDecoration,
        textAlign:
          props.alignment.toLowerCase() as React.CSSProperties["textAlign"],
      }}
    >
      {props.text}
    </div>
  );
};

export default Label;
