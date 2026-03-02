import { SimpleValueTypes } from '@/karabo/data/types';
import { HashType } from '@/karabo/data/typenums';
import { BaseBinding } from '@/lib/binding/BaseBinding';

export function formatTableCell(
  value: SimpleValueTypes,
  column: BaseBinding
): string {
  const hashType = column.hashType;

  // Handle floating point types - apply decimal formatting
  if (hashType === HashType.Float || hashType === HashType.Double) {
    const numValue = Number(value);

    if (isNaN(numValue)) {
      return String(value);
    }
    const decimalPlaces = 3;

    return numValue.toFixed(decimalPlaces);
  }

  // Handle integer types (no decimal places)
  if (
    hashType === HashType.Int8 ||
    hashType === HashType.Int16 ||
    hashType === HashType.Int32 ||
    hashType === HashType.Int64 ||
    hashType === HashType.UInt8 ||
    hashType === HashType.UInt16 ||
    hashType === HashType.UInt32 ||
    hashType === HashType.UInt64
  ) {
    // BigInt types (Int64, UInt64)
    if (typeof value === 'bigint') {
      return value.toString();
    }

    // Number types
    if (typeof value === 'number') {
      return value.toString();
    }

    // Fallback
    return String(value);
  }

  // Handle boolean
  if (hashType === HashType.Bool) {
    return value ? 'true' : 'false';
  }

  // Handle string and other types
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
  return [HashType.Float, HashType.Double].includes(hashType);
}
