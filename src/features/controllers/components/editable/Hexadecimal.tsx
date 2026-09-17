/** Hexadecimal — integer input displayed and entered in hexadecimal. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { HexadecimalModel } from '@/karabo/common/api';
import { isControllerEditable } from '../../utils/controller_semantics';
import { getControllerFontStyle } from '../../utils/fonts';

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
}> = ({ ctx }) => {
  const proxyValue = ctx?.proxy?.value;
  const enabled = ctx
    ? isControllerEditable(ctx.proxy, ctx.userAccessLevel)
    : false;

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
    <div className="w-full h-full flex items-center">
      <input
        data-testid="editable-hexadecimal"
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
        style={{
          ...getControllerFontStyle(),
        }}
        placeholder="0x0"
      />
    </div>
  );
};

export default Hexadecimal;
