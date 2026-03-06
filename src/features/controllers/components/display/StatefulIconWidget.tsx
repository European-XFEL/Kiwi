/** StatefulIconWidget — SVG icon recolored by device state. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/controllers/components/ControllerContainer';
import { StatefulIconWidgetModel } from '@/karabo/common/models/widgets/controllers/display';
import { registerRenderer } from '@/features/scene-view/registry';
import { useGuiStateColor } from '@/features/controllers/hooks/useGuiStateColor';
import { statefulIconModelsById } from '@/features/controllers/utils/bootstrapStatefulIcons';

// StatefulIconWidget
// ----------------------------------------------------------------------------

const StatefulIconWidget: React.FC<{
  model: StatefulIconWidgetModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const rawState =
    (ctx?.primary?.deviceState as string | undefined) ?? 'UNKNOWN';
  const { colorValue } = useGuiStateColor(rawState);
  const iconModel = statefulIconModelsById[model.icon_name] ?? null;

  const recoloredSvg = React.useMemo(() => {
    if (!iconModel) return '';
    return iconModel.withColor(colorValue).toSvgWithViewBox();
  }, [iconModel, colorValue]);

  return (
    <div
      className="flex items-center justify-center w-full h-full"
      title={ctx?.tooltipText ?? ctx?.disabledReason ?? model.icon_name}
    >
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

registerRenderer('StatefulIconWidget', StatefulIconWidget);

export default StatefulIconWidget;
