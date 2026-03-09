/** Rectangle — filled/stroked rectangular shape. No data binding. */

import React from 'react';
import { RectangleModel } from '@/karabo/common/scenemodel/shapes';
import { registerRenderer } from '@/features/scene-view/render/registry';
import { strokeFillAttrs } from './shapeUtils';

// Rectangle
// ----------------------------------------------------------------------------
// Rectangle has direct x/y/width/height so PositionedShell places it correctly.
// The SVG fills the shell and the rect fills the SVG — no coordinate math needed.

const Rectangle: React.FC<{ model: RectangleModel }> = ({ model }) => (
  <svg
    width="100%"
    height="100%"
    style={{ display: 'block', overflow: 'visible' }}
  >
    <rect x={0} y={0} width="100%" height="100%" {...strokeFillAttrs(model)} />
  </svg>
);

registerRenderer('Rectangle', Rectangle);

export default Rectangle;
