/**
 * Path — arbitrary SVG path defined by svg_data.
 *
 * PathModel has no bounding box so PositionedShell places it at (0,0)
 * with zero size. overflow: visible lets the path paint into scene space
 * using absolute coordinates from svg_data.
 */

import React from 'react';
import { PathModel } from '@/karabo/common/api';
import { registerRenderer } from '../../renderRegistry';
import { useShapeAttrs } from './shapeUtils';

// Path
// ----------------------------------------------------------------------------

const Path: React.FC<{ model: PathModel }> = React.memo(({ model }) => {
  const attrs = useShapeAttrs(model);

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'visible',
        pointerEvents: 'none',
      }}
    >
      <path d={model.svg_data} {...attrs} />
    </svg>
  );
});

registerRenderer('Path', Path);

export default Path;
