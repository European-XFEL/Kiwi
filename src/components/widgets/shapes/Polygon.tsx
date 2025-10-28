import React from "react";
import { PolygonElementProps } from "@/karabo_data/SceneElements";

const Polygon: React.FC<PolygonElementProps> = (props) => {
  // Destructure key out
  const { key, ...svgProps } = props;

  return (
    <polygon
      points={svgProps.points}
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

export default Polygon;
