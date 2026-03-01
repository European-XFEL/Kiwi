/** DisplayTrendGraph — placeholder, graph rendering not yet implemented. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/ControllerContainer';
import { DisplayTrendGraphModel } from '@/karabo/common/models/widgets/controllers/display';
import { registerRenderer } from '@/features/scene-view/render/registry';

const DisplayTrendGraph: React.FC<{
  model: DisplayTrendGraphModel;
  ctx?: ControllerContainerContext;
}> = ({ model: _model, ctx: _ctx }) => (
  <div
    className="w-full h-full border border-dashed border-gray-400 flex items-center justify-center text-xs text-gray-400 bg-gray-50 select-none"
    title="DisplayTrendGraph — not yet implemented"
  >
    Trend Graph
  </div>
);

registerRenderer('DisplayTrendGraph', DisplayTrendGraph);

export default DisplayTrendGraph;
