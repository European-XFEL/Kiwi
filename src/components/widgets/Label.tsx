import React from "react";
import type { LabelProps } from "../../scene/scene_types/staticWidgets";

const Label: React.FC<LabelProps> = (props) => {
  // Map alignment to flexbox justify classes
  const justifyClass =
    props.alignment === "center"
      ? "justify-center"
      : props.alignment === "right"
      ? "justify-end"
      : "justify-start";

  return (
    <div
      className={`absolute flex items-center border-solid ${justifyClass}`}
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
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
      }}
    >
      {props.text}
    </div>
  );
};

export default Label;
