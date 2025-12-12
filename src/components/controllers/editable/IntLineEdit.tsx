/**
 * IntLineEdit - controller component
 */

import * as React from 'react';
import type { IntLineEditProps } from '@/scene/scene_types/controllers';
import { FONT_FAMILY_DEFAULT } from '@/components/shared/helpers/fontDefaults';

const IntLineEdit: React.FC<IntLineEditProps> = ({
  font_size,
  font_weight,
  tooltipText,
  disabledReason,
  isEnabled,
  primary,
}) => {
  const value = primary?.value;
  const schemaAttrs = primary?.schemaAttrs;

  const enabled = isEnabled ?? true;

  const [localValue, setLocalValue] = React.useState<string>('');

  const unit = React.useMemo(() => {
    const prefix = schemaAttrs?.metricPrefixSymbol ?? '';
    const symbol = schemaAttrs?.unitSymbol ?? '';
    return `${prefix}${symbol}`.trim();
  }, [schemaAttrs?.metricPrefixSymbol, schemaAttrs?.unitSymbol]);

  React.useEffect(() => {
    const incoming = value ?? schemaAttrs?.defaultValue ?? 0;
    const intValue =
      typeof incoming === 'number' ? incoming : parseInt(String(incoming), 10);

    setLocalValue(Number.isFinite(intValue) ? String(intValue) : '');
  }, [value, schemaAttrs]);

  return (
    <div
      className="flex items-center gap-1 w-full h-full"
      title={tooltipText || disabledReason || primary?.propertyIndicator?.label}
    >
      <input
        type="text"
        inputMode="numeric"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={(e) => {
          const intValue = parseInt(e.target.value, 10);
          if (Number.isFinite(intValue)) {
            setLocalValue(String(intValue));
            // TODO: push value to backend
          } else {
            // optional: reset to last known good value
            const fallback = value ?? schemaAttrs?.defaultValue ?? '';
            const fv =
              typeof fallback === 'number'
                ? fallback
                : parseInt(String(fallback), 10);
            setLocalValue(Number.isFinite(fv) ? String(fv) : '');
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

      {unit && (
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
      )}
    </div>
  );
};

export default IntLineEdit;
