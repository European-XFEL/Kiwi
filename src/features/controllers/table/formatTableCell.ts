import { HashType, SimpleValueTypes } from '@/karabo/data/api.ts';
import { BaseBinding } from '@/lib/binding/api.ts';

export function formatTableCell(
  value: SimpleValueTypes,
  column: BaseBinding
): string {
  if (isFloatingPointType(column.hashType)) {
    const numValue = Number(value);
    if (!Number.isNaN(numValue)) {
      return numValue.toFixed(3);
    }
  }
  if (column.hashType === HashType.Bool) {
    return value ? 'true' : 'false';
  }
  return String(value);
}

/**
 * Check if a column type is numeric (for right-alignment)
 */
export function isNumericType(hashType: HashType): boolean {
  return [
    HashType.Int8,
    HashType.Int16,
    HashType.Int32,
    HashType.Int64,
    HashType.UInt8,
    HashType.UInt16,
    HashType.UInt32,
    HashType.UInt64,
    HashType.Float,
    HashType.Double,
  ].includes(hashType);
}

/**
 * Check if a column type is an integer type
 */
export function isIntegerType(hashType: HashType): boolean {
  return [
    HashType.Int8,
    HashType.Int16,
    HashType.Int32,
    HashType.Int64,
    HashType.UInt8,
    HashType.UInt16,
    HashType.UInt32,
    HashType.UInt64,
  ].includes(hashType);
}

/**
 * Check if a column type is a floating point type
 */
export function isFloatingPointType(hashType: HashType): boolean {
  return hashType === HashType.Float || hashType === HashType.Double;
}
