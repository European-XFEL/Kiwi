/** Polygon — closed polygon defined by a points string. */

import React from 'react';
import { PolygonModel } from '@/karabo/common/api';
import { registerRenderer } from '../../renderRegistry';
import { strokePad, shapeSvgProps, useShapeAttrs } from './shapeUtils';

// Polygon
// ----------------------------------------------------------------------------

const Polygon: React.FC<{ model: PolygonModel }> = React.memo(({ model }) => {
  const { computedX, computedY, computedWidth, computedHeight } = model;
  const pad = strokePad(model.stroke_width);
  const attrs = useShapeAttrs(model);

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
      <polygon points={model.points} {...attrs} />
    </svg>
  );
});

registerRenderer('Polygon', Polygon);

export default Polygon;
