import type { TableColumnInfo } from "@/karabo_data/DeviceSchemaInfo";
import { VectorElementType } from "@/karabo_hash/HashValueType";
import { HashTypes, UInt8 } from "karabo-ts";

interface FormatOptions {
  decimalPlaces?: number;
}

/**
 * Format a table cell value based on its column type
 */
export function formatTableCell(
  value: VectorElementType,
  column: TableColumnInfo,
  options?: FormatOptions
): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return "";
  }

  // Handle UInt8 wrapper class
  if (value instanceof UInt8) {
    return value.value_.toString();
  }

  const valueType = column.columnAttributes.valueType;

  // Handle floating point types - apply decimal formatting
  if (valueType === HashTypes.Float32 || valueType === HashTypes.Float64) {
    const numValue = Number(value);

    if (isNaN(numValue)) {
      return String(value);
    }

    // Use explicit option, or check schema attribute, or default to 2
    const decimalPlaces =
      options?.decimalPlaces ?? column.columnAttributes.decimalPlaces ?? 2;

    return numValue.toFixed(decimalPlaces);
  }

  // Handle integer types (no decimal places)
  if (
    valueType === HashTypes.Int8 ||
    valueType === HashTypes.Int16 ||
    valueType === HashTypes.Int32 ||
    valueType === HashTypes.Int64 ||
    valueType === HashTypes.UInt8 ||
    valueType === HashTypes.UInt16 ||
    valueType === HashTypes.UInt32 ||
    valueType === HashTypes.UInt64
  ) {
    // BigInt types (Int64, UInt64)
    if (typeof value === "bigint") {
      return value.toString();
    }

    // Number types
    if (typeof value === "number") {
      return value.toString();
    }

    // Fallback
    return String(value);
  }

  // Handle boolean
  if (valueType === HashTypes.Bool) {
    return value ? "true" : "false";
  }

  // Handle string and other types
  return String(value);
}

/**
 * Check if a column type is numeric (for right-alignment)
 */
export function isNumericType(valueType: HashTypes): boolean {
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
  ].includes(valueType);
}

/**
 * Check if a column type is an integer type
 */
export function isIntegerType(valueType: HashTypes): boolean {
  return [
    HashTypes.Int8,
    HashTypes.Int16,
    HashTypes.Int32,
    HashTypes.Int64,
    HashTypes.UInt8,
    HashTypes.UInt16,
    HashTypes.UInt32,
    HashTypes.UInt64,
  ].includes(valueType);
}

/**
 * Check if a column type is a floating point type
 */
export function isFloatingPointType(valueType: HashTypes): boolean {
  return [HashTypes.Float32, HashTypes.Float64].includes(valueType);
}
