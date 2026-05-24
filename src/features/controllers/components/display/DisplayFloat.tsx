/** DisplayFloat — displays a float value with fmt/decimals formatting. */

import React from 'react';
import type { ControllerContainerContext } from '../ControllerContainer';
import { DisplayFloatModel, FONT_FAMILY_DEFAULT } from '@/karabo/common/api';
import { registerRenderer } from '@/features/scene-view/renderRegistry';

// DisplayFloat
// ----------------------------------------------------------------------------

function formatFloat(value: unknown, fmt: string, decimals: string): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  const p = Math.max(0, parseInt(decimals, 10) || 8);
  if (fmt === 'f') return num.toFixed(p);
  if (fmt === 'e') return num.toExponential(p);
  // 'g' — significant figures
  return parseFloat(num.toPrecision(p)).toString();
}

const DisplayFloat: React.FC<{
  model: DisplayFloatModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const value = ctx?.primary?.value;
  const unit = ctx?.primary?.binding?.unit_label ?? '';

  const display =
    value !== undefined ? formatFloat(value, model.fmt, model.decimals) : '';
  const labelValue = display && unit ? `${display} ${unit}` : display;

  return (
    <div
      className="overflow-clip flex items-center justify-center border border-solid p-px w-full h-full"
      style={{
        fontFamily: FONT_FAMILY_DEFAULT,
        fontSize: model.font_size,
        fontWeight: model.font_weight,
      }}
    >
      {labelValue}
    </div>
  );
};

registerRenderer('DisplayFloat', DisplayFloat);

export default DisplayFloat;
