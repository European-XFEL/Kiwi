/** StatefulIconWidget — SVG icon recolored by device state. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { StatefulIconWidgetModel } from '@/karabo/common/api';
import { getStateColor } from '@/lib/Indicators';
import { statefulIconModelsById } from '../../utils/bootstrapStatefulIcons';

// StatefulIconWidget
// ----------------------------------------------------------------------------

const StatefulIconWidget: React.FC<{
  model: StatefulIconWidgetModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const rawState = (ctx?.proxy?.root.state as string | undefined) ?? '';
  const colorValue = getStateColor(rawState);
  const iconModel = statefulIconModelsById[model.icon_name] ?? null;

  const recoloredSvg = React.useMemo(() => {
    if (!iconModel) return '';
    return iconModel.withColor(colorValue).toSvgWithViewBox();
  }, [iconModel, colorValue]);

  return (
    <div className="flex items-center justify-center w-full h-full">
      {recoloredSvg ? (
        <div
          style={{ width: '100%', height: '100%' }}
          dangerouslySetInnerHTML={{ __html: recoloredSvg }}
        />
      ) : (
        <div className="w-full h-full border border-dashed border-gray-400 flex items-center justify-center text-xs text-gray-400 bg-gray-50 select-none">
          {model.icon_name || 'No icon'}
        </div>
      )}
    </div>
  );
};

export default StatefulIconWidget;
