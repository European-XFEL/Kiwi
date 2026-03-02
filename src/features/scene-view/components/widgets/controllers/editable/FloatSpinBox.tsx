/** FloatSpinBox — float spin box with configurable step and decimals. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/components/ControllerContainer';
import { FloatSpinBoxModel } from '@/karabo/common/models/widgets/controllers/editable';
import { registerRenderer } from '@/features/scene-view/render/registry';
import { FONT_FAMILY_DEFAULT } from '@/karabo/common/utils/fontDefaults';

// FloatSpinBox
// ----------------------------------------------------------------------------

const FloatSpinBox: React.FC<{
  model: FloatSpinBoxModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const proxyValue = ctx?.primary?.value;
  const enabled = ctx?.isEnabled ?? false;
  const step = model.step > 0 ? model.step : 0.1;

  const toDisplay = (v: unknown) => {
    const num = Number(v ?? 0);
    return Number.isFinite(num) ? num.toFixed(model.decimals) : '0';
  };

  const [localValue, setLocalValue] = React.useState(() =>
    toDisplay(proxyValue)
  );
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    if (isEditing) return;
    const next = toDisplay(proxyValue);
    setLocalValue((prev) => (prev === next ? prev : next));
  }, [proxyValue, isEditing]);

  return (
    <div
      className="w-full h-full flex items-center"
      title={ctx?.tooltipText ?? ctx?.disabledReason}
    >
      <input
        type="number"
        step={step}
        value={localValue}
        onFocus={() => setIsEditing(true)}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={(e) => {
          setIsEditing(false);
          const parsed = parseFloat(e.target.value);
          if (Number.isFinite(parsed)) {
            setLocalValue(toDisplay(parsed));
            // TODO: push parsed to backend
          } else {
            setLocalValue(toDisplay(proxyValue));
          }
        }}
        disabled={!enabled}
        className={`border border-solid rounded px-1 w-full ${
          enabled
            ? 'text-black bg-white cursor-text'
            : 'text-gray-500 bg-gray-100 cursor-not-allowed'
        }`}
        style={{
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: model.font_size,
          fontWeight: model.font_weight,
        }}
      />
    </div>
  );
};

registerRenderer('FloatSpinBox', FloatSpinBox);

export default FloatSpinBox;
