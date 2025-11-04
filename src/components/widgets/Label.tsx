import React from "react";
import type { LabelProps } from "../../scene/scene_types/staticWidgets";

const Label: React.FC<LabelProps> = (props) => {
  return (
    <div
      className="absolute flex items-center overflow-hidden text-ellipsis whitespace-nowrap border-solid p-0.5"
      role="text"
      aria-label={props.text}
      style={{
        width: `${props.width}px`,
        height: `${props.height}px`,
        left: `${props.x}px`,
        top: `${props.y}px`,
        borderWidth: props.frame_width,
        borderColor: props.foreground,
        color: props.foreground,
        backgroundColor: props.background,
        fontFamily: props.font_family,
        fontSize: props.font_size,
        fontWeight: props.font_weight,
        fontStyle: props.font_style,
        textDecoration: props.text_decoration,
        textAlign:
          props.alignment.toLowerCase() as React.CSSProperties["textAlign"],
      }}
    >
      {props.text}
    </div>
  );
};

export default Label;
