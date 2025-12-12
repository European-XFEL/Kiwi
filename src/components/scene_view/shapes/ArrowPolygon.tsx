import React from 'react';
import type { ArrowPolygonProps } from '@/scene/scene_types/shapes';

/**
 * ArrowPolygon Component - Renders a line with a polygon arrowhead.
 * Uses the primitive fields defined in ArrowPolygonProps.
 */
const ArrowPolygon: React.FC<ArrowPolygonProps> = (props) => {
  const {
    x1,
    y1,
    x2,
    y2,
    hx1,
    hy1,
    hx2,
    hy2,
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

  // Convert stroke_dasharray (if number[]) to valid string
  const dashArray = Array.isArray(stroke_dasharray)
    ? stroke_dasharray.join(' ')
    : stroke_dasharray;

  return (
    <g>
      {/* Line shaft */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
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

      {/* Arrowhead Polygon */}
      <polygon
        points={`${x2},${y2} ${hx1},${hy1} ${hx2},${hy2}`}
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
    </g>
  );
};

export default ArrowPolygon;
