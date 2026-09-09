/** Line — two-point line segment. */

import React from 'react';
import { LineModel } from '@/karabo/common/api';
import { registerRenderer } from '../../renderRegistry';
import { strokePad, shapeSvgProps, useShapeAttrs } from './shapeUtils';

// Line
// ----------------------------------------------------------------------------

const Line: React.FC<{ model: LineModel }> = React.memo(({ model }) => {
  const {
    x1,
    y1,
    x2,
    y2,
    computedX,
    computedY,
    computedWidth,
    computedHeight,
  } = model;
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
      <line x1={x1} y1={y1} x2={x2} y2={y2} {...attrs} />
    </svg>
  );
});

registerRenderer('Line', Line);

export default Line;
