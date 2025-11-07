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

  // Add extra width to account for browser rendering differences
  // Even with Source Sans Pro font, browser rendering (anti-aliasing, kerning)
  // differs from Qt's rendering engine, requiring additional space
  const adjustedWidth = props.width + 6;

  return (
    <div
      className={`absolute flex items-center border-solid ${justifyClass}`}
      role="text"
      aria-label={props.text}
      style={{
        width: `${adjustedWidth}px`,
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
        paddingLeft: "4px",
        paddingRight: "4px",
      }}
    >
      {props.text}
    </div>
  );
};

export default Label;
