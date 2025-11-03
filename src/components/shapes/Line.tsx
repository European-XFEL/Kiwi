import React from "react";
import { LineProps } from "@/scene/scene_types/shapes";

const Line: React.FC<LineProps> = (props) => {
  const { ...svgProps } = props;

  return (
    <line
      x1={svgProps.x1}
      y1={svgProps.y1}
      x2={svgProps.x2}
      y2={svgProps.y2}
      stroke={svgProps.stroke}
      strokeWidth={svgProps.stroke_width}
      strokeOpacity={svgProps.stroke_opacity}
      strokeLinecap={svgProps.stroke_linecap}
      strokeDasharray={
        Array.isArray(svgProps.stroke_dasharray)
          ? svgProps.stroke_dasharray.join(" ")
          : svgProps.stroke_dasharray
      }
      strokeDashoffset={svgProps.stroke_dashoffset}
      strokeLinejoin={svgProps.stroke_linejoin}
      strokeMiterlimit={svgProps.stroke_miterlimit}
      fill={svgProps.fill}
      fillOpacity={svgProps.fill_opacity}
    />
  );
};

export default Line;
