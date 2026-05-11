/** Hexadecimal — integer input displayed and entered in hexadecimal. */

import React from 'react';
import type { ControllerContainerContext } from '../ControllerContainer';
import { HexadecimalModel, FONT_FAMILY_DEFAULT } from '@/karabo/common/api';
import { registerRenderer } from '@/features/scene-view/renderRegistry';

// Hexadecimal
// ----------------------------------------------------------------------------

function toHexString(value: unknown): string {
  const num = typeof value === 'number' ? value : parseInt(String(value), 10);
  return Number.isFinite(num)
    ? `0x${Math.trunc(num).toString(16).toUpperCase()}`
    : '0x0';
}

const Hexadecimal: React.FC<{
  model: HexadecimalModel;
  ctx?: ControllerContainerContext;
}> = ({ model: _model, ctx }) => {
  const proxyValue = ctx?.primary?.value;
  const enabled = ctx?.isEnabled ?? false;

  const [localValue, setLocalValue] = React.useState(() =>
    toHexString(proxyValue)
  );
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    if (isEditing) return;
    const next = toHexString(proxyValue);
    setLocalValue((prev) => (prev === next ? prev : next));
  }, [proxyValue, isEditing]);

  return (
    <div
      className="w-full h-full flex items-center"
      title={ctx?.tooltipText ?? ctx?.disabledReason}
    >
      <input
        type="text"
        value={localValue}
        onFocus={() => setIsEditing(true)}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={(e) => {
          setIsEditing(false);
          const raw = e.target.value.replace(/^0x/i, '');
          const parsed = parseInt(raw, 16);
          if (Number.isFinite(parsed)) {
            setLocalValue(toHexString(parsed));
            // TODO: push parsed to backend
          } else {
            setLocalValue(toHexString(proxyValue));
          }
        }}
        disabled={!enabled}
        className={`w-full border border-solid rounded px-1 font-mono ${
          enabled
            ? 'text-black bg-white cursor-text'
            : 'text-gray-500 bg-gray-100 cursor-not-allowed'
        }`}
        style={{ fontFamily: FONT_FAMILY_DEFAULT }}
        placeholder="0x0"
      />
    </div>
  );
};

registerRenderer('Hexadecimal', Hexadecimal);

export default Hexadecimal;
