/** DisplayStateColor — colour box reflecting device state, optional state string. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { DisplayStateColorModel } from '@/karabo/common/api';
import { getStateColor } from '@/lib/Indicators';
import { getControllerFontStyle } from '../../utils/fonts';
import { toStringValue } from '../../utils/getBindingValue';

// DisplayStateColor
// ----------------------------------------------------------------------------

const DisplayStateColor: React.FC<{
  model: DisplayStateColorModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const rawState = ctx ? toStringValue(ctx.proxy) : '';
  const bgColor = getStateColor(rawState);

  return (
    <div className="flex items-center justify-center border border-solid overflow-hidden w-full h-full">
      <div
        className="w-full h-full flex items-center justify-center"
        style={{
          ...getControllerFontStyle(model.font_size, model.font_weight),
          backgroundColor: bgColor,
        }}
      >
        {model.show_string && rawState ? (
          <span aria-live="polite">{rawState}</span>
        ) : null}
      </div>
    </div>
  );
};

export default DisplayStateColor;
