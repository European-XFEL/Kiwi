import React from "react";
import { ArrowPolygonElementProps } from "@/karabo_data/SceneElements";
import Line from "../Line";
import Polygon from "../Polygon";

/**
 * ArrowPolygon Component - Renders an arrow with a polygon arrowhead
 */
const ArrowPolygon: React.FC<ArrowPolygonElementProps> = (props) => {
  // Extract and strip key props before spreading
  const { line, polygon } = props;
  const { key: lineKey, ...lineProps } = line;
  const { key: polygonKey, ...polygonProps } = polygon;

  return (
    <g>
      {/* Line shaft */}
      <Line key={lineKey} {...lineProps} />

      {/* Polygon arrowhead */}
      <Polygon key={polygonKey} {...polygonProps} />
    </g>
  );
};

export default ArrowPolygon;
