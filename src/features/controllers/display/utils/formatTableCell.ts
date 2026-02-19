import { SimpleValueTypes } from '@/karabo/data/types';
import { HashTypes } from '@/karabo/data/typenums';
import { BaseBinding } from '@/lib/binding/BaseBinding';

export function formatTableCell(
  value: SimpleValueTypes,
  column: BaseBinding
): string {
  const hashType = column.hashType;

  // Handle floating point types - apply decimal formatting
  if (hashType === HashTypes.Float32 || hashType === HashTypes.Float64) {
    const numValue = Number(value);

    if (isNaN(numValue)) {
      return String(value);
    }
    const decimalPlaces = 3;

    return numValue.toFixed(decimalPlaces);
  }

  // Handle integer types (no decimal places)
  if (
    hashType === HashTypes.Int8 ||
    hashType === HashTypes.Int16 ||
    hashType === HashTypes.Int32 ||
    hashType === HashTypes.Int64 ||
    hashType === HashTypes.UInt8 ||
    hashType === HashTypes.UInt16 ||
    hashType === HashTypes.UInt32 ||
    hashType === HashTypes.UInt64
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
  if (hashType === HashTypes.Bool) {
    return value ? 'true' : 'false';
  }

  // Handle string and other types
  return String(value);
}

/**
 * Check if a column type is numeric (for right-alignment)
 */
export function isNumericType(hashType: HashTypes): boolean {
  return [
    HashTypes.Int8,
    HashTypes.Int16,
    HashTypes.Int32,
    HashTypes.Int64,
    HashTypes.UInt8,
    HashTypes.UInt16,
    HashTypes.UInt32,
    HashTypes.UInt64,
    HashTypes.Float32,
    HashTypes.Float64,
  ].includes(hashType);
}

/**
 * Check if a column type is an integer type
 */
export function isIntegerType(hashType: HashTypes): boolean {
  return [
    HashTypes.Int8,
    HashTypes.Int16,
    HashTypes.Int32,
    HashTypes.Int64,
    HashTypes.UInt8,
    HashTypes.UInt16,
    HashTypes.UInt32,
    HashTypes.UInt64,
  ].includes(hashType);
}

/**
 * Check if a column type is a floating point type
 */
export function isFloatingPointType(hashType: HashTypes): boolean {
  return [HashTypes.Float32, HashTypes.Float64].includes(hashType);
}
