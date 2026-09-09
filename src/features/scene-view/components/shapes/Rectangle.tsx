/** Rectangle — filled/stroked rectangular shape. No data binding. */

import React from 'react';
import { RectangleModel } from '@/karabo/common/api';
import { registerRenderer } from '../../renderRegistry';
import { useShapeAttrs } from './shapeUtils';

// Rectangle
// ----------------------------------------------------------------------------
// Rectangle has direct x/y/width/height so PositionedShell places it correctly.
// The SVG fills the shell and the rect fills the SVG — no coordinate math needed.

const Rectangle: React.FC<{ model: RectangleModel }> = React.memo(
  ({ model }) => {
    const attrs = useShapeAttrs(model);

    return (
      <svg
        width="100%"
        height="100%"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <rect x={0} y={0} width="100%" height="100%" {...attrs} />
      </svg>
    );
  }
);

registerRenderer('Rectangle', Rectangle);

export default Rectangle;
