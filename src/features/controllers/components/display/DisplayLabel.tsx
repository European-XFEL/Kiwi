/** DisplayLabel — display controller. Config from model, device data from ctx. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { DisplayLabelModel } from '@/karabo/common/api';
import { getControllerFontStyle } from '../../utils/fonts';
import { toStringValue } from '../../utils/getBindingValue';

// DisplayLabel
// ----------------------------------------------------------------------------

const DisplayLabel: React.FC<{
  model: DisplayLabelModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  if (!ctx)
    return (
      <div
        className="w-full h-full border border-dashed opacity-40"
        title="No device binding"
      />
    );

  const labelValue = toStringValue(ctx.proxy, true);

  return (
    <div className="overflow-hidden flex items-center justify-center border border-solid p-px w-full h-full">
      <span
        className="block whitespace-nowrap overflow-hidden text-ellipsis max-w-full"
        style={{
          ...getControllerFontStyle(model.font_size, model.font_weight),
          lineHeight: 1,
        }}
      >
        {labelValue}
      </span>
    </div>
  );
};

export default DisplayLabel;
