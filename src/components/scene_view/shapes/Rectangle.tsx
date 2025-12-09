import React from "react";
import { RectangleProps } from "@/scene/scene_types/shapes";

/**
 * Rectangle Component - Renders a pure SVG rectangle element.
 * Uses props directly from RectangleModel (no internal widgets).
 */
const Rectangle: React.FC<RectangleProps> = (props) => {
  const {
    x,
    y,
    width,
    height,
    stroke,
    stroke_width,
    stroke_opacity,
    stroke_linecap,
    stroke_dasharray,
    stroke_dashoffset,
    stroke_linejoin,
    stroke_miterlimit,
    fill,
    fill_opacity,
  } = props;

  // Ensure stroke-dasharray is a valid string
  const dashArray = Array.isArray(stroke_dasharray)
    ? stroke_dasharray.join(" ")
    : stroke_dasharray;

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      stroke={stroke}
      strokeWidth={stroke_width}
      strokeOpacity={stroke_opacity}
      strokeLinecap={stroke_linecap}
      strokeDasharray={dashArray}
      strokeDashoffset={stroke_dashoffset}
      strokeLinejoin={stroke_linejoin}
      strokeMiterlimit={stroke_miterlimit}
      fill={fill}
      fillOpacity={fill_opacity}
    />
  );
};

export default Rectangle;
