/** DisplayAlarmFloat — float display colour-coded by alarm/warn thresholds. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { DisplayAlarmFloatModel } from '@/karabo/common/api';
import { DEFAULT_VALUE_FIELD_BG } from '@/lib/colors';
import { getControllerFontStyle } from '../../utils/fonts';
import {
  getBindingValue,
  toStringFloatValue,
} from '../../utils/getBindingValue';

// DisplayAlarmFloat
// ----------------------------------------------------------------------------

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
  const value = getBindingValue(ctx?.proxy);
  const labelValue = toStringFloatValue(
    ctx?.proxy,
    model.fmt,
    model.decimals,
    true
  );
  const numericValue = Number(value);
  const color = Number.isFinite(numericValue)
    ? alarmColor(numericValue, model)
    : undefined;

  return (
    <div
      className="overflow-clip flex items-center justify-center border border-solid border-black p-px w-full h-full"
      style={{
        ...getControllerFontStyle(model.font_size, model.font_weight),
        backgroundColor: color ?? DEFAULT_VALUE_FIELD_BG,
      }}
    >
      {labelValue}
    </div>
  );
};

export default DisplayAlarmFloat;
