/** Evaluator — shows device value (expression evaluation deferred). */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { EvaluatorModel } from '@/karabo/common/api';
import { DEFAULT_VALUE_FIELD_BG } from '@/lib/colors';
import { getControllerFontStyle } from '../../utils/fonts';
import { DoubleBinding, FloatBinding } from '@/lib/binding/api';
import { toStringFloatValue, toStringValue } from '../../utils/getBindingValue';

// Evaluator
// ----------------------------------------------------------------------------

const Evaluator: React.FC<{
  model: EvaluatorModel;
  ctx: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const binding = ctx.proxy?.binding;
  let labelValue;
  if (binding instanceof FloatBinding) {
    labelValue = toStringFloatValue(ctx.proxy, 'g', '3', true);
  } else if (binding instanceof DoubleBinding) {
    labelValue = toStringFloatValue(ctx.proxy, 'g', '5', true);
  } else {
    labelValue = toStringValue(ctx.proxy, true);
  }
  return (
    <div
      className="overflow-clip flex items-center justify-center border border-solid border-black p-px w-full h-full"
      style={{
        backgroundColor: DEFAULT_VALUE_FIELD_BG,
        ...getControllerFontStyle(model.font_size, model.font_weight),
      }}
    >
      {labelValue}
    </div>
  );
};

export default Evaluator;
