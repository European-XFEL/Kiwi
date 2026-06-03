/** Evaluator — shows device value (expression evaluation deferred). */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { EvaluatorModel } from '@/karabo/common/api';
import { scalarToString } from '@/karabo/data/api';
import { getControllerFontStyle } from '../../utils/fonts';

// Evaluator
// ----------------------------------------------------------------------------

const Evaluator: React.FC<{
  model: EvaluatorModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const value = ctx?.proxy?.value;
  const binding = ctx?.proxy?.binding;

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
        ...getControllerFontStyle(model.font_size, model.font_weight),
      }}
    >
      {labelValue}
    </div>
  );
};

export default Evaluator;
