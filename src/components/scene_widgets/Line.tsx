import React from "react";
import { LineElementProps } from "@/karabo_data/SceneElements";

const Line: React.FC<LineElementProps> = (props) => {
  // Destructure key out
  const { key, ...svgProps } = props;

  return (
    <line
      x1={svgProps.x1}
      y1={svgProps.y1}
      x2={svgProps.x2}
      y2={svgProps.y2}
      stroke={svgProps.strokeColor}
      strokeWidth={svgProps.strokeWidth}
      strokeOpacity={svgProps.strokeOpacity}
      strokeLinecap={svgProps.strokeLinecap}
      strokeDasharray={svgProps.strokeDasharray}
      strokeDashoffset={svgProps.strokeDashoffset}
      strokeLinejoin={svgProps.strokeLinejoin}
      strokeMiterlimit={svgProps.strokeMiterlimit}
      fill={svgProps.fillColor}
      fillOpacity={svgProps.fillOpacity}
    />
  );
};

export default Line;
