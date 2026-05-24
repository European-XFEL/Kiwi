/** TickSlider — range slider with optional value label. */

import React from 'react';
import type { ControllerContainerContext } from '../ControllerContainer';
import { TickSliderModel, FONT_FAMILY_DEFAULT } from '@/karabo/common/api';
import { registerRenderer } from '@/features/scene-view/renderRegistry';

// TickSlider
// ----------------------------------------------------------------------------

const TickSlider: React.FC<{
  model: TickSliderModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const proxyValue = ctx?.primary?.value;
  const binding = ctx?.primary?.binding as any;
  const enabled = ctx?.primary?.isEnabled ?? false;

  const min = binding?.minInc ?? 0;
  const max = binding?.maxInc ?? 100;
  const step = model.ticks > 0 ? (max - min) / model.ticks : 1;

  const [localValue, setLocalValue] = React.useState(Number(proxyValue ?? min));

  React.useEffect(() => {
    setLocalValue(Number(proxyValue ?? min));
  }, [proxyValue, min]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localValue}
        disabled={!enabled}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          setLocalValue(val);
          // TODO: push val to backend
        }}
        className="w-full"
      />
      {model.show_value ? (
        <span
          className="text-xs text-black"
          style={{ fontFamily: FONT_FAMILY_DEFAULT }}
        >
          {localValue}
        </span>
      ) : null}
    </div>
  );
};

registerRenderer('TickSlider', TickSlider);

export default TickSlider;
