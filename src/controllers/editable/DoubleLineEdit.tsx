/**
 * DoubleLineEdit - controller component
 */
import * as React from 'react';
import type { DoubleLineEditProps } from '@/scene/scene_types/controllers';
import { FONT_FAMILY_DEFAULT } from '../utils/fontDefaults';

import { formatScalarValueWithUnit } from '@/shared/helpers/validation_helpers/value_formatters';

import {
  schemaSaysFloat,
  schemaSaysInt,
  schemaSaysVector,
  schemaSaysBool,
  schemaSaysString,
  type SchemaValueType,
} from '@/shared/helpers/validation_helpers/schema_type_identifier';

function normalizeFontWeight(input?: string) {
  if (!input) return undefined;

  const v = input.toLowerCase().replace(/\s|_/g, '');

  if (v === 'thin') return 100;
  if (v === 'extralight' || v === 'ultralight') return 200;
  if (v === 'light') return 300;
  if (v === 'regular' || v === 'normal') return 400;
  if (v === 'medium') return 500;
  if (v === 'semibold' || v === 'demibold') return 600;
  if (v === 'bold') return 700;
  if (v === 'extrabold' || v === 'ultrabold') return 800;
  if (v === 'black' || v === 'heavy') return 900;

  const asNum = Number(input);
  return Number.isFinite(asNum) ? asNum : undefined;
}

const DoubleLineEdit: React.FC<DoubleLineEditProps> = ({
  decimals = -1,
  font_size,
  font_weight,
  tooltipText,
  disabledReason,
  isEnabled = true,
  primary,
}) => {
  const value = primary?.value;
  const schemaAttrs = primary?.schemaAttrs;

  const [localValue, setLocalValue] = React.useState<string>('');

  /**
   * Prevent the sync effect from overwriting user typing.
   * This is the "Number-of-edit prototype" pattern.
   */
  const isEditingRef = React.useRef(false);

  // Resolve schema value type from common locations
  const schemaValueType = React.useMemo<SchemaValueType | undefined>(() => {
    const fromPrimary = (primary as any)?.valueType as
      | SchemaValueType
      | undefined;
    const fromSchema = (schemaAttrs as any)?.valueType as
      | SchemaValueType
      | undefined;
    return fromPrimary ?? fromSchema;
  }, [primary, schemaAttrs]);

  // Build combined unit string
  const unit = React.useMemo(() => {
    const prefix = schemaAttrs?.metricPrefixSymbol ?? '';
    const symbol = schemaAttrs?.unitSymbol ?? '';
    return `${prefix}${symbol}`.trim();
  }, [schemaAttrs?.metricPrefixSymbol, schemaAttrs?.unitSymbol]);

  /**
   * Number-only formatting for the input string
   * - keeps unit OUT of the input
   * - respects decimals when explicitly set
   */
  const formatForInput = React.useCallback(
    (num: number): string => {
      if (schemaSaysVector(schemaValueType)) {
        return String(num);
      }

      if (
        schemaSaysString(schemaValueType) ||
        schemaSaysBool(schemaValueType)
      ) {
        return String(num);
      }

      if (schemaSaysInt(schemaValueType)) {
        const intVal = Number.isNaN(num) ? 0 : Math.trunc(num);
        return formatScalarValueWithUnit({
          value: intVal,
          schemaValueType,
          unit: '',
        });
      }

      if (schemaSaysFloat(schemaValueType)) {
        if (decimals === -1) {
          return formatScalarValueWithUnit({
            value: num,
            schemaValueType,
            unit: '',
            floatPrecision: 8,
          });
        }

        return Number.isNaN(num) ? '' : num.toFixed(decimals);
      }

      // Unknown numeric fallback: treat like float for UI purposes
      if (decimals === -1) {
        return formatScalarValueWithUnit({
          value: num,
          schemaValueType,
          unit: '',
          floatPrecision: 8,
        });
      }

      return Number.isNaN(num) ? '' : num.toFixed(decimals);
    },
    [schemaValueType, decimals]
  );

  /**
   * Full display formatting with unit (tooltip etc.)
   */
  const formatForDisplay = React.useCallback(
    (val: unknown): string =>
      formatScalarValueWithUnit({
        value: val,
        schemaValueType,
        unit,
        floatPrecision: 8,
      }),
    [schemaValueType, unit]
  );

  /**
   * Commit handler (multi-strategy)
   */
  const commitToPrimary = React.useCallback(
    (nextValue: number) => {
      if (!primary) return;
      const anyPrimary = primary as any;

      if (typeof anyPrimary.setValue === 'function') {
        anyPrimary.setValue(nextValue);
        return;
      }
      if (typeof anyPrimary.onChange === 'function') {
        anyPrimary.onChange(nextValue);
        return;
      }
      if (typeof anyPrimary.update === 'function') {
        anyPrimary.update({ value: nextValue });
        return;
      }
    },
    [primary]
  );

  /**
   * Schema-aware coercion for saving.
   * This is the key piece for "runtime type change":
   * - FLOAT -> keep float
   * - INT   -> truncate
   * - non-numeric schema -> do not commit a number
   */
  const coerceForCommit = React.useCallback(
    (raw: string): number | null => {
      const num = parseFloat(raw);
      if (Number.isNaN(num)) return null;

      if (schemaSaysInt(schemaValueType)) {
        return Math.trunc(num);
      }

      if (schemaSaysFloat(schemaValueType)) {
        return num;
      }

      // If schema flips to string/bool/vector, this control shouldn't commit a number.
      if (
        schemaSaysString(schemaValueType) ||
        schemaSaysBool(schemaValueType) ||
        schemaSaysVector(schemaValueType)
      ) {
        return null;
      }

      // Unknown: default to numeric float-like
      return num;
    },
    [schemaValueType]
  );

  /**
   * Sync local with external value/default
   * - will also re-run if schemaValueType changes
   *   because formatForInput will change.
   */
  React.useEffect(() => {
    if (isEditingRef.current) return;

    const incoming = value ?? schemaAttrs?.defaultValue ?? 0;
    const numValue =
      typeof incoming === 'number' ? incoming : parseFloat(String(incoming));

    setLocalValue(!isNaN(numValue) ? formatForInput(numValue) : '');
  }, [value, schemaAttrs?.defaultValue, formatForInput]);

  /**
   * Tooltip/title
   */
  const computedTitle = React.useMemo(() => {
    if (tooltipText) return tooltipText;
    if (disabledReason) return disabledReason;

    const incoming = value ?? schemaAttrs?.defaultValue;
    if (incoming !== undefined) {
      const formatted = formatForDisplay(incoming);
      if (formatted) return formatted;
    }

    return primary?.propertyIndicator?.label;
  }, [
    tooltipText,
    disabledReason,
    value,
    schemaAttrs?.defaultValue,
    formatForDisplay,
    primary?.propertyIndicator?.label,
  ]);

  const handleBlur = (raw: string) => {
    const coerced = coerceForCommit(raw);

    if (coerced == null) {
      // Reset to last known external/default
      const incoming = value ?? schemaAttrs?.defaultValue ?? 0;
      const num =
        typeof incoming === 'number' ? incoming : parseFloat(String(incoming));

      setLocalValue(!isNaN(num) ? formatForInput(num) : '');
      return;
    }

    setLocalValue(formatForInput(coerced));
    commitToPrimary(coerced);
  };

  return (
    <div
      className="flex items-center gap-1 w-full h-full"
      title={computedTitle}
    >
      <input
        type="text"
        inputMode="decimal"
        value={localValue}
        onFocus={() => {
          isEditingRef.current = true;
        }}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={(e) => {
          isEditingRef.current = false;
          handleBlur(e.target.value);
        }}
        disabled={!isEnabled}
        className={`border border-solid rounded px-1 flex-1 min-w-0 ${
          isEnabled
            ? 'text-black bg-white cursor-text'
            : 'text-gray-500 bg-gray-100 cursor-not-allowed'
        }`}
        style={{
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: font_size,
          fontWeight: normalizeFontWeight(font_weight),
        }}
        placeholder={isEnabled ? '0.0' : 'Read-only'}
      />

      {unit && (
        <span
          className="text-black"
          style={{
            fontFamily: FONT_FAMILY_DEFAULT,
            fontSize: font_size,
            fontWeight: normalizeFontWeight(font_weight),
          }}
        >
          {unit}
        </span>
      )}
    </div>
  );
};

export default DoubleLineEdit;
