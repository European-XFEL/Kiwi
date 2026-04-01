/** DisplayLabel — display controller. Config from model, device data from ctx. */

import React from 'react';
import type { ControllerContainerContext } from '../ControllerContainer';
import { DisplayLabelModel } from '@/karabo/common/api';
import { registerRenderer } from '@/features/scene-view/registry';
import { scalarToString } from '@/karabo/data/api';
import { getControllerFontStyle } from '../../utils/fonts';

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
  const value = ctx.primary?.value;
  const binding = ctx.primary?.binding;

  const labelValue =
    value !== undefined
      ? scalarToString({
          value,
          hashType: binding?.hashType as any,
          unit: binding?.unit_label ?? '',
          floatPrecision: 8,
        })
      : '';

  return (
    <div
      className="overflow-hidden flex items-center justify-center border border-solid p-px w-full h-full"
      title={ctx.tooltipText ?? ctx.disabledReason}
    >
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

registerRenderer('DisplayLabel', DisplayLabel);

export default DisplayLabel;
