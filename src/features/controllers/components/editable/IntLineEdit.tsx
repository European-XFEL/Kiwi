/** IntLineEdit — integer input, syncs from the primary proxy, normalizes local input on blur. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { IntLineEditModel } from '@/karabo/common/api';
import { isControllerEditable } from '../../utils/controller_semantics';
import { getControllerFontStyle } from '../../utils/fonts';

// IntLineEdit
// ----------------------------------------------------------------------------

function toIntString(v: unknown, fallback = ''): string {
  if (v == null) return fallback;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? String(n) : fallback;
}

const IntLineEdit: React.FC<{
  model: IntLineEditModel;
  ctx?: ControllerContainerContext;
}> = ({ ctx }) => {
  const liveValue = ctx?.proxy?.value;
  const unit = ctx?.proxy?.binding?.unit_label;
  const enabled = ctx
    ? isControllerEditable(ctx.proxy, ctx.userAccessLevel)
    : false;

  const [localValue, setLocalValue] = React.useState<string>(() =>
    toIntString(liveValue, '0')
  );
  const [isEditing, setIsEditing] = React.useState(false);

  // Sync from the primary proxy when the live value changes, but don't stomp user typing
  React.useEffect(() => {
    if (isEditing) return;
    const next = toIntString(liveValue, '0');
    setLocalValue((prev) => (prev === next ? prev : next));
  }, [liveValue, isEditing]);

  return (
    <div className="flex items-center gap-1 w-full h-full">
      <input
        data-testid="editable-int-line-edit"
        type="text"
        inputMode="numeric"
        value={localValue}
        onFocus={() => setIsEditing(true)}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={(e) => {
          setIsEditing(false);
          const parsed = parseInt(e.target.value, 10);
          if (Number.isFinite(parsed)) {
            const normalized = String(parsed);
            setLocalValue((prev) => (prev === normalized ? prev : normalized));
            return;
          }

          const fallback = toIntString(liveValue, '0');
          setLocalValue((prev) => (prev === fallback ? prev : fallback));
        }}
        disabled={!enabled}
        className={`border border-solid rounded px-1 flex-1 min-w-0 ${
          enabled
            ? 'text-black bg-white cursor-text'
            : 'text-gray-500 bg-gray-100 cursor-not-allowed'
        }`}
        style={{
          ...getControllerFontStyle(),
        }}
        placeholder={enabled ? '0' : 'Read-only'}
      />
      {unit ? (
        <span
          className="text-black"
          style={{
            ...getControllerFontStyle(),
          }}
        >
          {unit}
        </span>
      ) : null}
    </div>
  );
};

export default IntLineEdit;
