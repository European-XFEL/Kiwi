/** DisplayAlarmFloat — float display colour-coded by alarm/warn thresholds. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { DisplayAlarmFloatModel } from '@/karabo/common/api';
import { getControllerFontStyle } from '../../utils/fonts';

// DisplayAlarmFloat
// ----------------------------------------------------------------------------

function formatFloat(value: unknown, fmt: string, decimals: string): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  const p = Math.max(0, parseInt(decimals, 10) || 8);
  if (fmt === 'f') return num.toFixed(p);
  if (fmt === 'e') return num.toExponential(p);
  return parseFloat(num.toPrecision(p)).toString();
}

function alarmColor(
  num: number,
  model: DisplayAlarmFloatModel
): string | undefined {
  if (
    (model.alarmHigh !== undefined && num >= model.alarmHigh) ||
    (model.alarmLow !== undefined && num <= model.alarmLow)
  )
    return '#ff4444';
  if (
    (model.warnHigh !== undefined && num >= model.warnHigh) ||
    (model.warnLow !== undefined && num <= model.warnLow)
  )
    return '#ffaa00';
  return undefined;
}

const DisplayAlarmFloat: React.FC<{
  model: DisplayAlarmFloatModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const value = ctx?.proxy?.value;
  const unit = ctx?.proxy?.binding?.unit_label ?? '';

  const num = Number(value);
  const display =
    value !== undefined ? formatFloat(value, model.fmt, model.decimals) : '';
  const labelValue = display && unit ? `${display} ${unit}` : display;
  const color = Number.isFinite(num) ? alarmColor(num, model) : undefined;

  return (
    <div
      className="overflow-clip flex items-center justify-center border border-solid p-px w-full h-full"
      style={{
        ...getControllerFontStyle(model.font_size, model.font_weight),
        backgroundColor: color,
      }}
    >
      {labelValue}
    </div>
  );
};

export default DisplayAlarmFloat;
