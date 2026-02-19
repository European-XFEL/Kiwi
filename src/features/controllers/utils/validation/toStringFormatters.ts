import type { HashTypes } from '@/karabo-hash/typenums';
import {
  schemaSaysBool as isBoolType,
  schemaSaysFloat as isFloatType,
  schemaSaysInt as isIntegerType,
  schemaSaysString as isStringType,
  schemaSaysVector as isVectorType,
} from './hashTypeIdentifiers';

interface FormatScalarOptions {
  value: unknown;
  hashType?: HashTypes;
  unit?: string;
  floatPrecision?: number;
}

const withUnit = (display: string, unit?: string) => {
  return unit ? `${display} ${unit}` : display;
};

const formatFloat = (value: unknown, precision: number) => {
  const num = Number(value);
  return Number.isNaN(num)
    ? String(value)
    : parseFloat(num.toPrecision(precision)).toString();
};

const formatInt = (value: unknown) => String(Number(value));

const formatBool = (value: unknown) =>
  typeof value === 'boolean' ? String(value) : String(Boolean(value));

export function scalarToString({
  value,
  hashType,
  unit,
  floatPrecision = 8,
}: FormatScalarOptions): string {
  if (value == null) return '';

  // Vector: don't attempt scalar formatting
  if (isVectorType(hashType)) return withUnit(String(value), unit);

  if (isStringType(hashType)) return withUnit(String(value), unit);

  if (isBoolType(hashType)) return withUnit(formatBool(value), unit);

  if (isFloatType(hashType))
    return withUnit(formatFloat(value, floatPrecision), unit);

  if (isIntegerType(hashType)) return withUnit(formatInt(value), unit);

  return withUnit(String(value), unit);
}

export function vectorToString(value: unknown, maxPreview = 6): string {
  if (value == null) return '';

  const preview = (arr: unknown[]) => {
    const head = arr.slice(0, maxPreview).map(String).join(', ');
    return arr.length > maxPreview ? `[${head}, …]` : `[${head}]`;
  };

  if (Array.isArray(value)) return preview(value);

  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    try {
      return preview(Array.from(value as any));
    } catch {
      return String(value);
    }
  }

  return String(value);
}
