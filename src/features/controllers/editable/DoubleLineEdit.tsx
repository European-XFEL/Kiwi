import * as React from 'react';
import type { DoubleLineEditProps } from '@/scene/scene_types/controllers';
import { FONT_FAMILY_DEFAULT } from '../utils/fontDefaults';

import { scalarToString } from '@/features/controllers/utils/validation/toStringFormatters';
import {
  isHashFloat,
  isHashInteger,
  isHashVector,
  isHashBool,
  isHashString,
} from '@/features/controllers/utils/validation/hashTypeIdentifiers';
import { HashType } from '@/karabo/data';

function normalizeFontWeight(input?: string) {
  if (!input) return undefined;

  const v = input.toLowerCase().replace(/\s|_/g, '');

  switch (v) {
    case 'thin':
      return 100;
    case 'extralight':
    case 'ultralight':
      return 200;
    case 'light':
      return 300;
    case 'regular':
    case 'normal':
      return 400;
    case 'medium':
      return 500;
    case 'semibold':
    case 'demibold':
      return 600;
    case 'bold':
      return 700;
    case 'extrabold':
    case 'ultrabold':
      return 800;
    case 'black':
    case 'heavy':
      return 900;
    default: {
      const asNum = Number(input);
      return Number.isFinite(asNum) ? asNum : undefined;
    }
  }
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null) return null;
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

const DOUBLE_LINE_FLOAT_PRECISION = 8;

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
  const binding = primary?.binding;

  const [localValue, setLocalValue] = React.useState('');

  /**
   * Prevent the sync effect from overwriting user typing.
   * "Number-of-edit prototype" pattern.
   */
  const isEditingRef = React.useRef(false);

  const schemaValueType = React.useMemo<HashType | undefined>(() => {
    const p = primary as any;
    const b = binding as any;
    return (
      (p?.valueType as HashType | undefined) ??
      (b?.valueType as HashType | undefined)
    );
  }, [primary, binding]);

  const unit = binding?.unit_label ?? '';

  const schemaFormat = React.useMemo(() => {
    return {
      isInt: isHashInteger(schemaValueType),
      isFloat: isHashFloat(schemaValueType),
      isVector: isHashVector(schemaValueType),
      isBool: isHashBool(schemaValueType),
      isString: isHashString(schemaValueType),
    };
  }, [schemaValueType]);

  const fontStyle = React.useMemo(
    () => ({
      fontFamily: FONT_FAMILY_DEFAULT,
      fontSize: font_size,
      fontWeight: normalizeFontWeight(font_weight),
    }),
    [font_size, font_weight]
  );

  const precisionForInput =
    decimals === -1 ? DOUBLE_LINE_FLOAT_PRECISION : decimals;

  /**
   * Number-only formatting for the input string
   * - keeps unit OUT of the input
   * - respects decimals when explicitly set
   */
  const formatForInput = React.useCallback(
    (num: number): string => {
      // If schema flips to non-numeric, keep UI stable (still show something)
      if (
        schemaFormat.isVector ||
        schemaFormat.isBool ||
        schemaFormat.isString
      ) {
        return String(num);
      }

      if (schemaFormat.isInt) {
        const intVal = Math.trunc(num);
        return scalarToString({
          value: intVal,
          hashType: schemaValueType,
          unit: '',
        });
      }

      // Float or unknown numeric fallback
      if (!Number.isFinite(num)) return '';

      if (decimals === -1) {
        return scalarToString({
          value: num,
          hashType: schemaValueType,
          unit: '',
          floatPrecision: DOUBLE_LINE_FLOAT_PRECISION,
        });
      }

      return num.toFixed(precisionForInput);
    },
    [schemaFormat, schemaValueType, decimals, precisionForInput]
  );

  /**
   * Full display formatting with unit (tooltip etc.)
   */
  const formatForDisplay = React.useCallback(
    (val: unknown): string =>
      scalarToString({
        value: val,
        hashType: schemaValueType,
        unit: unit || undefined,
        floatPrecision: DOUBLE_LINE_FLOAT_PRECISION,
      }),
    [schemaValueType, unit]
  );

  /**
   * Commit handler (multi-strategy)
   */
  const commitToPrimary = React.useCallback(
    (nextValue: number) => {
      if (!primary) return;
      const p = primary as any;

      if (typeof p.setValue === 'function') return p.setValue(nextValue);
      if (typeof p.onChange === 'function') return p.onChange(nextValue);
      if (typeof p.update === 'function') return p.update({ value: nextValue });
    },
    [primary]
  );

  /**
   * Schema-aware coercion for saving.
   * - FLOAT -> keep float
   * - INT   -> truncate
   * - non-numeric schema -> do not commit a number
   */
  const coerceForCommit = React.useCallback(
    (raw: string): number | null => {
      const num = toNumber(raw);
      if (num == null) return null;

      if (schemaFormat.isInt) return Math.trunc(num);
      if (schemaFormat.isFloat) return num;

      // If schema flips to string/bool/vector, this control shouldn't commit a number.
      if (schemaFormat.isString || schemaFormat.isBool || schemaFormat.isVector)
        return null;

      // Unknown: default to numeric float-like
      return num;
    },
    [schemaFormat]
  );

  /**
   * Sync local with external value/default
   * - will also re-run if schemaValueType changes because formatForInput changes
   */
  React.useEffect(() => {
    if (isEditingRef.current) return;

    const incoming = value ?? binding?.value ?? 0;
    const num = toNumber(incoming);

    setLocalValue(num == null ? '' : formatForInput(num));
  }, [value, binding?.value, formatForInput]);

  /**
   * Tooltip/title
   */
  const computedTitle = React.useMemo(() => {
    if (tooltipText) return tooltipText;
    if (disabledReason) return disabledReason;

    if (value !== undefined) {
      const formatted = formatForDisplay(value);
      if (formatted) return formatted;
    }

    return primary?.propertyIndicator?.label;
  }, [
    tooltipText,
    disabledReason,
    value,
    formatForDisplay,
    primary?.propertyIndicator?.label,
  ]);

  const resetToExternal = React.useCallback(() => {
    const incoming = value ?? binding?.value ?? 0;
    const num = toNumber(incoming);
    setLocalValue(num == null ? '' : formatForInput(num));
  }, [value, binding?.value, formatForInput]);

  const handleBlur = React.useCallback(
    (raw: string) => {
      const coerced = coerceForCommit(raw);

      if (coerced == null) {
        resetToExternal();
        return;
      }

      setLocalValue(formatForInput(coerced));
      commitToPrimary(coerced);
    },
    [coerceForCommit, resetToExternal, formatForInput, commitToPrimary]
  );

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
        style={fontStyle}
        placeholder={isEnabled ? '0.0' : 'Read-only'}
      />

      {unit ? (
        <span className="text-black" style={fontStyle}>
          {unit}
        </span>
      ) : null}
    </div>
  );
};

export default DoubleLineEdit;
