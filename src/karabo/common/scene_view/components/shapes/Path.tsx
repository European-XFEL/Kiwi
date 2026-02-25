/**
 * Path — arbitrary SVG path defined by svg_data.
 *
 * PathModel has no bounding box so PositionedShell places it at (0,0)
 * with zero size. overflow: visible lets the path paint into scene space
 * using absolute coordinates from svg_data.
 */

import React from 'react';
import { PathModel } from '@/karabo/common/models/shapes';
import { registerRenderer } from '@/karabo/common/scene_view/render/registry';

// Path
// ----------------------------------------------------------------------------

const Path: React.FC<{ model: PathModel }> = ({ model }) => (
  <svg
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      overflow: 'visible',
      pointerEvents: 'none',
    }}
  >
    <path
      d={model.svg_data}
      fill={model.fill}
      fillOpacity={model.fill_opacity}
      stroke={model.stroke}
      strokeOpacity={model.stroke_opacity}
      strokeWidth={model.stroke_width}
      strokeLinecap={model.stroke_linecap}
      strokeLinejoin={model.stroke_linejoin}
      strokeMiterlimit={model.stroke_miterlimit}
      strokeDashoffset={model.stroke_dashoffset}
      strokeDasharray={
        model.stroke_dasharray.length
          ? model.stroke_dasharray.join(' ')
          : undefined
      }
    />
  </svg>
);

registerRenderer('Path', Path);

export default Path;
