/** DisplayFloat — displays a float value with fmt/decimals formatting. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { DisplayFloatModel } from '@/karabo/common/api';
import { getControllerFontStyle } from '../../utils/fonts';
import { toStringNumberValue } from '../../utils/getBindingValue';

// DisplayFloat
// ----------------------------------------------------------------------------

const DisplayFloat: React.FC<{
  model: DisplayFloatModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const labelValue = toStringNumberValue(
    ctx?.proxy,
    model.fmt,
    model.decimals,
    true
  );

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

export default DisplayFloat;
