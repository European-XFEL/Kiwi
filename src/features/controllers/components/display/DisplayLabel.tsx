/** DisplayLabel — display controller. Config from model, device data from ctx. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { DEFAULT_VALUE_FIELD_BG } from '@/lib/colors';
import { DisplayLabelModel } from '@/karabo/common/api';
import { DoubleBinding, FloatBinding } from '@/lib/binding/api';
import { getControllerFontStyle } from '../../utils/fonts';
import { toStringFloatValue, toStringValue } from '../../utils/getBindingValue';

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

  const binding = ctx.proxy?.binding;
  const labelValue =
    binding instanceof FloatBinding || binding instanceof DoubleBinding
      ? toStringFloatValue(ctx.proxy, 'g', '8', true)
      : toStringValue(ctx.proxy, true);
  const backgroundColor = DEFAULT_VALUE_FIELD_BG;

  return (
    <div
      className="overflow-hidden flex items-center justify-center border border-solid border-black p-px w-full h-full"
      style={{ backgroundColor }}
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

export default DisplayLabel;
