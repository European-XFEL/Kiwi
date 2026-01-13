/**
 * value_formatters
 *
 * Centralized display formatting for controllers like:
 * - DisplayLabel
 * - DoubleLineEdit
 *
 * Keeps UI consistent and makes precision rules easy to adjust.
 */

import {
  schemaSaysFloat,
  schemaSaysInt,
  schemaSaysString,
  schemaSaysBool,
  schemaSaysVector,
  type SchemaValueType,
} from './schema_type_identifier';

interface FormatScalarOptions {
  value: unknown;
  schemaValueType?: SchemaValueType; // schemaAttrs.valueType or primary.valueType
  unit?: string; // already combined prefix+symbol
  floatPrecision?: number; // default 8 (GUI-like)
}

/**
 * Format *scalar* value with optional unit.
 *
 * Rules:
 * - If schema says VECTOR → do not attempt scalar formatting.
 * - If schema says FLOAT → apply precision-based formatting.
 * - If schema says INT → normalize numeric integer display.
 * - If schema says BOOL → normalize to "true"/"false".
 * - If schema says STRING → return string as-is.
 * - Else → default string output.
 */
export function formatScalarValueWithUnit({
  value,
  schemaValueType,
  unit = '',
  floatPrecision = 8,
}: FormatScalarOptions): string {
  if (value === undefined || value === null) return '';

  const cleanUnit = unit.trim();

  // Guard: avoid scalar formatting for vectors
  if (schemaSaysVector(schemaValueType)) {
    const raw = String(value);
    return cleanUnit ? `${raw} ${cleanUnit}` : raw;
  }

  // STRING formatting
  if (schemaSaysString(schemaValueType)) {
    const raw = String(value);
    return cleanUnit ? `${raw} ${cleanUnit}` : raw;
  }

  // BOOL formatting
  if (schemaSaysBool(schemaValueType)) {
    const raw =
      typeof value === 'boolean' ? String(value) : String(Boolean(value));
    return cleanUnit ? `${raw} ${cleanUnit}` : raw;
  }

  // FLOAT formatting
  if (schemaSaysFloat(schemaValueType)) {
    const num = Number(value);
    const displayValue = Number.isNaN(num)
      ? String(value)
      : parseFloat(num.toPrecision(floatPrecision)).toString();

    return cleanUnit ? `${displayValue} ${cleanUnit}` : displayValue;
  }

  // INT formatting
  if (schemaSaysInt(schemaValueType)) {
    const num = Number(value);
    const displayValue = Number.isNaN(num) ? String(value) : String(num);
    return cleanUnit ? `${displayValue} ${cleanUnit}` : displayValue;
  }

  // Default
  const raw = String(value);
  return cleanUnit ? `${raw} ${cleanUnit}` : raw;
}

/**
 * Optional helper for vector labels or debug output.
 */
export function formatVectorSummary(value: unknown, maxPreview = 6): string {
  if (value == null) return '';

  if (Array.isArray(value)) {
    const head = value.slice(0, maxPreview).map(String).join(', ');
    return value.length > maxPreview ? `[${head}, …]` : `[${head}]`;
  }

  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    try {
      const arr = Array.from(value as any);
      const head = arr.slice(0, maxPreview).map(String).join(', ');
      return arr.length > maxPreview ? `[${head}, …]` : `[${head}]`;
    } catch {
      return String(value);
    }
  }

  return String(value);
}
