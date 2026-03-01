/** Polygon — closed polygon defined by a points string. */

import React from 'react';
import { PolygonModel } from '@/karabo/common/models/shapes';
import { registerRenderer } from '@/features/scene-view/render/registry';
import { strokePad, shapeSvgProps, strokeFillAttrs } from './shapeUtils';

// Polygon
// ----------------------------------------------------------------------------

const Polygon: React.FC<{ model: PolygonModel }> = ({ model }) => {
  const { computedX, computedY, computedWidth, computedHeight } = model;
  const pad = strokePad(model.stroke_width);

  return (
    <svg
      {...shapeSvgProps(
        computedX,
        computedY,
        computedWidth,
        computedHeight,
        pad
      )}
    >
      <polygon points={model.points} {...strokeFillAttrs(model)} />
    </svg>
  );
};

registerRenderer('Polygon', Polygon);

export default Polygon;
