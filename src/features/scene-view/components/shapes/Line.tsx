/** Line — two-point line segment. */

import React from 'react';
import { LineModel } from '@/karabo/common/api';
import { registerRenderer } from '@/features/scene-view/render/registry';
import { strokePad, shapeSvgProps, strokeFillAttrs } from './shapeUtils';

// Line
// ----------------------------------------------------------------------------

const Line: React.FC<{ model: LineModel }> = ({ model }) => {
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
      <line x1={x1} y1={y1} x2={x2} y2={y2} {...strokeFillAttrs(model)} />
    </svg>
  );
};

registerRenderer('Line', Line);

export default Line;
