/** DoubleLineEdit — float input, syncs from device, writes back on blur. */

import React from 'react';
import type { ControllerContainerContext } from '../ControllerContainer';
import { DoubleLineEditModel, FONT_FAMILY_DEFAULT } from '@/karabo/common/api';
import { registerRenderer } from '@/features/scene-view/renderRegistry';

// DoubleLineEdit
// ----------------------------------------------------------------------------

function toFloatString(value: unknown, decimals: number): string {
  if (value == null) return '';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(num)) return '';
  return decimals >= 0
    ? num.toFixed(decimals)
    : String(parseFloat(num.toPrecision(8)));
}

const DoubleLineEdit: React.FC<{
  model: DoubleLineEditModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const proxyValue = ctx?.primary?.value;
  const unit = ctx?.primary?.binding?.unit_label ?? '';
  const enabled = ctx?.primary?.isEnabled ?? false;

  const [localValue, setLocalValue] = React.useState(() =>
    toFloatString(proxyValue, model.decimals)
  );
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    if (isEditing) return;
    const next = toFloatString(proxyValue, model.decimals);
    setLocalValue((prev) => (prev === next ? prev : next));
  }, [proxyValue, isEditing, model.decimals]);

  return (
    <div className="flex items-center gap-1 w-full h-full">
      <input
        type="text"
        inputMode="decimal"
        value={localValue}
        onFocus={() => setIsEditing(true)}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={(e) => {
          setIsEditing(false);
          const parsed = parseFloat(e.target.value);
          if (Number.isFinite(parsed)) {
            setLocalValue(toFloatString(parsed, model.decimals));
            // TODO: push parsed to backend
          } else {
            setLocalValue(toFloatString(proxyValue, model.decimals));
          }
        }}
        disabled={!enabled}
        className={`border border-solid rounded px-1 flex-1 min-w-0 ${
          enabled
            ? 'text-black bg-white cursor-text'
            : 'text-gray-500 bg-gray-100 cursor-not-allowed'
        }`}
        style={{ fontFamily: FONT_FAMILY_DEFAULT }}
        placeholder={enabled ? '0.0' : 'Read-only'}
      />
      {unit ? (
        <span
          className="text-black"
          style={{ fontFamily: FONT_FAMILY_DEFAULT }}
        >
          {unit}
        </span>
      ) : null}
    </div>
  );
};

registerRenderer('DoubleLineEdit', DoubleLineEdit);

export default DoubleLineEdit;
