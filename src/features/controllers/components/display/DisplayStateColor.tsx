/** DisplayStateColor — colour box reflecting device state, optional state string. */

import React from 'react';
import type { ControllerContainerContext } from '../ControllerContainer';
import {
  DisplayStateColorModel,
  FONT_FAMILY_DEFAULT,
} from '@/karabo/common/api';
import { registerRenderer } from '@/features/scene-view/renderRegistry';
import { useGuiStateColor } from '@/features/controllers/hooks/useGuiStateColor';

// DisplayStateColor
// ----------------------------------------------------------------------------

const DisplayStateColor: React.FC<{
  model: DisplayStateColorModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const rawState = (ctx?.proxy?.root.state as string | undefined) ?? '';
  const { colorValue } = useGuiStateColor(rawState);
  const bgColor = colorValue ?? '#cccccc';

  return (
    <div className="flex items-center justify-center border border-solid overflow-hidden w-full h-full">
      <div
        className="w-full h-full flex items-center justify-center"
        style={{
          backgroundColor: bgColor,
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: model.font_size,
          fontWeight: model.font_weight,
        }}
      >
        {model.show_string && rawState ? (
          <span className="text-xs" aria-live="polite">
            {rawState}
          </span>
        ) : null}
      </div>
    </div>
  );
};

registerRenderer('DisplayStateColor', DisplayStateColor);

export default DisplayStateColor;
