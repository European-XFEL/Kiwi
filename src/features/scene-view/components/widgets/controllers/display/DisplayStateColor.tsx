/** DisplayStateColor — colour box reflecting device state, optional state string. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/components/ControllerContainer';
import { DisplayStateColorModel } from '@/karabo/common/models/widgets/controllers/display';
import { registerRenderer } from '@/features/scene-view/render/registry';
import { useGuiStateColor } from '@/features/icons/hooks/useGuiStateColor';
import { FONT_FAMILY_DEFAULT } from '@/karabo/common/utils/fontDefaults';

// DisplayStateColor
// ----------------------------------------------------------------------------

const DisplayStateColor: React.FC<{
  model: DisplayStateColorModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const rawState = (ctx?.primary?.deviceState as string | undefined) ?? '';
  const { colorValue } = useGuiStateColor(rawState);
  const bgColor = colorValue ?? '#cccccc';

  return (
    <div
      className="flex items-center justify-center border border-solid overflow-hidden w-full h-full"
      title={ctx?.tooltipText ?? ctx?.disabledReason}
    >
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
