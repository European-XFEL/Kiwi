/** StatefulIconWidget — placeholder, icon system not yet ported. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/ControllerContainer';
import { StatefulIconWidgetModel } from '@/karabo/common/models/widgets/controllers/display';
import { registerRenderer } from '@/features/scene-view/render/registry';

const StatefulIconWidget: React.FC<{
  model: StatefulIconWidgetModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx: _ctx }) => (
  <div
    className="w-full h-full border border-dashed border-gray-400 flex items-center justify-center text-xs text-gray-400 bg-gray-50 select-none"
    title={`StatefulIconWidget: ${model.icon_name || 'no icon'}`}
  >
    Icon
  </div>
);

registerRenderer('StatefulIconWidget', StatefulIconWidget);

export default StatefulIconWidget;
