/** DisplayFloat — displays a float value with fmt/decimals formatting. */

import React from 'react';
import type { ControllerContainerContext } from '../ControllerContainer';
import { DisplayFloatModel } from '@/karabo/common/api';
import { registerRenderer } from '@/features/scene-view/renderRegistry';
import { getControllerFontStyle } from '../../utils/fonts';

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
  const value = ctx?.proxy?.value;
  const unit = ctx?.proxy?.binding?.unit_label ?? '';

  const display =
    value !== undefined ? formatFloat(value, model.fmt, model.decimals) : '';
  const labelValue = display && unit ? `${display} ${unit}` : display;

  return (
    <div
      className="overflow-clip flex items-center justify-center border border-solid p-px w-full h-full"
      style={{
        ...getControllerFontStyle(model.font_size, model.font_weight),
      }}
    >
      {labelValue}
    </div>
  );
};

registerRenderer('DisplayFloat', DisplayFloat);

export default DisplayFloat;
