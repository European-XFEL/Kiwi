/** ArrowPolygon — line shaft with a triangular arrowhead. */

import React from 'react';
import { ArrowPolygonModel } from '@/karabo/common/api';
import { registerRenderer } from '../../renderRegistry';
import { strokePad, shapeSvgProps, strokeFillAttrs } from './shapeUtils';

// ArrowPolygon
// ----------------------------------------------------------------------------

const ArrowPolygon: React.FC<{ model: ArrowPolygonModel }> = React.memo(
  ({ model }) => {
    const {
      x1,
      y1,
      x2,
      y2,
      hx1,
      hy1,
      hx2,
      hy2,
      computedX,
      computedY,
      computedWidth,
      computedHeight,
    } = model;
    const pad = strokePad(model.stroke_width);

    // The arrowhead is a triangle: tip at the line's end point (x2, y2),
    // with the two base corners at (hx1, hy1) and (hx2, hy2).
    const arrowheadPoints = `${x2},${y2} ${hx1},${hy1} ${hx2},${hy2}`;

    const attrs = strokeFillAttrs(model);

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
        {/* Shaft */}
        <line x1={x1} y1={y1} x2={x2} y2={y2} {...attrs} />
        {/* Arrowhead — filled with the stroke colour so it matches the shaft */}
        <polygon
          points={arrowheadPoints}
          {...attrs}
          fill={model.stroke}
          fillOpacity={model.stroke_opacity}
        />
      </svg>
    );
  }
);

registerRenderer('ArrowPolygon', ArrowPolygon);

export default ArrowPolygon;
