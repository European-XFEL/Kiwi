/** DisplayLabel — display controller. Config from model, device data from deviceCtx. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene_view/ControllerContainer';
import { DisplayLabelModel } from '@/karabo-common/models/widgets/controllers/display';
import { registerRenderer } from '@/karabo-common/render/registry';
import { formatScalarValueWithUnit } from '@/features/controllers/utils/validation/value_formatters';
import { FONT_FAMILY_DEFAULT } from '@/features/controllers/utils/fontDefaults';

// DisplayLabel
// ----------------------------------------------------------------------------

const DisplayLabel: React.FC<{
  model: DisplayLabelModel;
  deviceCtx?: ControllerContainerContext;
}> = ({ model, deviceCtx }) => {
  if (!deviceCtx)
    return (
      <div
        className="w-full h-full border border-dashed opacity-40"
        title="No device binding"
      />
    );
  const value = deviceCtx.primary?.value;
  const binding = deviceCtx.primary?.binding;

  const labelValue =
    value !== undefined
      ? formatScalarValueWithUnit({
          value,
          schemaValueType: binding?.hashType as any,
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
      title={deviceCtx.tooltipText ?? deviceCtx.disabledReason}
    >
      {labelValue}
    </div>
  );
};

registerRenderer('DisplayLabel', DisplayLabel);

export default DisplayLabel;
