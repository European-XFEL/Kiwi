/** IntLineEdit — integer input, syncs from device, writes back on blur. */

import React from 'react';
import type { ControllerContainerContext } from '@/features/controllers/components/ControllerContainer';
import { IntLineEditModel } from '@/karabo/common/models/widgets/controllers/editable';
import { registerRenderer } from '@/features/scene-view/registry';
import { FONT_FAMILY_DEFAULT } from '@/karabo/common/utils/fontDefaults';

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
}> = ({ model: _model, ctx }) => {
  const proxyValue = ctx?.primary?.value;
  const unit = ctx?.primary?.binding?.unit_label;
  const enabled = ctx?.isEnabled ?? false;

  const [localValue, setLocalValue] = React.useState<string>(() =>
    toIntString(proxyValue, '0')
  );
  const [isEditing, setIsEditing] = React.useState(false);

  // Sync from backend when it changes, but don't stomp user typing
  React.useEffect(() => {
    if (isEditing) return;
    const next = toIntString(proxyValue, '0');
    setLocalValue((prev) => (prev === next ? prev : next));
  }, [proxyValue, isEditing]);

  const title = ctx?.tooltipText ?? ctx?.disabledReason;

  return (
    <div className="flex items-center gap-1 w-full h-full" title={title}>
      <input
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
            // TODO: push value to backend
          } else {
            const fallback = toIntString(proxyValue, '0');
            setLocalValue((prev) => (prev === fallback ? prev : fallback));
          }
        }}
        disabled={!enabled}
        className={`border border-solid rounded px-1 flex-1 min-w-0 ${
          enabled
            ? 'text-black bg-white cursor-text'
            : 'text-gray-500 bg-gray-100 cursor-not-allowed'
        }`}
        style={{ fontFamily: FONT_FAMILY_DEFAULT }}
        placeholder={enabled ? '0' : 'Read-only'}
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

registerRenderer('IntLineEdit', IntLineEdit);

export default IntLineEdit;
