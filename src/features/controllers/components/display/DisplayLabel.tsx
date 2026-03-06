/** DisplayLabel — display controller. Config from model, device data from ctx. */

import React from 'react';
import type { ControllerContainerContext } from '../ControllerContainer';
import { DisplayLabelModel, FONT_FAMILY_DEFAULT } from '@/karabo/common/api';
import { registerRenderer } from '@/features/scene-view/registry';
import { scalarToString } from '@/karabo/data/string_converter';

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
      className="overflow-clip flex items-center justify-center border border-solid p-px w-full h-full"
      style={{
        fontFamily: FONT_FAMILY_DEFAULT,
        fontSize: model.font_size,
        fontWeight: model.font_weight,
      }}
      title={ctx.tooltipText ?? ctx.disabledReason}
    >
      {labelValue}
    </div>
  );
};

registerRenderer('DisplayLabel', DisplayLabel);

export default DisplayLabel;
