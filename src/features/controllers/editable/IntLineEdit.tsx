/**
 * IntLineEdit - controller component
 */

import * as React from 'react';
import type { IntLineEditProps } from '@/scene/scene_types/controllers';
import { FONT_FAMILY_DEFAULT } from '../utils/fontDefaults';

function toIntString(v: unknown, fallback = ''): string {
  if (v == null) return fallback;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? String(n) : fallback;
}

const IntLineEdit: React.FC<IntLineEditProps> = ({
  font_size,
  font_weight,
  tooltipText,
  disabledReason,
  isEnabled,
  primary,
}) => {
  const proxyValue = primary?.value;
  const unit = primary?.binding?.unit_label;

  const enabled = isEnabled ?? true;

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

  const title =
    tooltipText || disabledReason || primary?.propertyIndicator?.label;

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
            // TODO: push value to backend (parsed)
          } else {
            // reset to last known backend value
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
        style={{
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: font_size,
          fontWeight: font_weight?.toLowerCase(),
        }}
        placeholder={enabled ? '0' : 'Read-only'}
      />

      {unit ? (
        <span
          className="text-black"
          style={{
            fontFamily: FONT_FAMILY_DEFAULT,
            fontSize: font_size,
            fontWeight: font_weight?.toLowerCase(),
          }}
        >
          {unit}
        </span>
      ) : null}
    </div>
  );
};

export default IntLineEdit;
