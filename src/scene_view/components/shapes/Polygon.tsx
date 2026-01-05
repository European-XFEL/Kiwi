import React from 'react';
import { PolygonProps } from '@/scene/scene_types/shapes';

const Polygon: React.FC<PolygonProps> = (props) => {
  const { ...svgProps } = props;

  return (
    <polygon
      points={svgProps.points}
      stroke={svgProps.stroke}
      strokeWidth={svgProps.stroke_width}
      strokeOpacity={svgProps.stroke_opacity}
      strokeLinecap={svgProps.stroke_linecap}
      strokeDasharray={
        Array.isArray(svgProps.stroke_dasharray)
          ? svgProps.stroke_dasharray.join(' ')
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

export default Polygon;
