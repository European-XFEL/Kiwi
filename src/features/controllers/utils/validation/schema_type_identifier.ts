/**
 * schema_type_identifiers
 *
 * Schema-first type identification with tolerant input handling.
 *
 * Why:
 * - In some places, schema valueType may appear as a string (e.g. "FLOAT", "STRING"),
 *   while in others you may already have concrete HashTypes numbers.
 * - We want a single, safe way to interpret schema intent.
 *
 * This file intentionally does NOT format values.
 * It only answers "what does the schema say?"
 */

import { HashTypes } from '@/karabo-hash/typenums';

/**
 * ValueType may come from:
 * - schemaAttrs.valueType (string like "FLOAT", "STRING", "INT", "VECTOR_*")
 * - primary.valueType (string)
 * - or sometimes mis-wired places that might pass HashTypes numbers.
 *
 * We accept unknown and normalize.
 */
export type SchemaValueType = unknown;

// Runtime groups (HashTypes-based)
const FLOAT_TYPES = new Set<number>([HashTypes.Float32, HashTypes.Float64]);

const INT_TYPES = new Set<number>([
  HashTypes.Int8,
  HashTypes.Int16,
  HashTypes.Int32,
  HashTypes.Int64,
  HashTypes.UInt8,
  HashTypes.UInt16,
  HashTypes.UInt32,
  HashTypes.UInt64,
]);

const STRING_TYPES = new Set<number>([HashTypes.String]);

const BOOL_TYPES = new Set<number>([HashTypes.Bool]);

const VECTOR_TYPES = new Set<number>([
  HashTypes.VectorBool,
  HashTypes.VectorChar,
  HashTypes.VectorFloat32,
  HashTypes.VectorFloat64,
  HashTypes.VectorInt8,
  HashTypes.VectorInt16,
  HashTypes.VectorInt32,
  HashTypes.VectorInt64,
  HashTypes.VectorString,
  HashTypes.VectorUInt8,
  HashTypes.VectorUInt16,
  HashTypes.VectorUInt32,
  HashTypes.VectorUInt64,
  HashTypes.VectorHash,
]);

// ------------------------------
// Schema-first checks
// ------------------------------

export function schemaSaysFloat(valueType?: SchemaValueType): boolean {
  if (valueType == null) return false;

  if (typeof valueType === 'string') {
    return valueType.toUpperCase() === 'FLOAT';
  }

  if (typeof valueType === 'number') {
    return FLOAT_TYPES.has(valueType);
  }

  return false;
}

export function schemaSaysInt(valueType?: SchemaValueType): boolean {
  if (valueType == null) return false;

  if (typeof valueType === 'string') {
    return valueType.toUpperCase() === 'INT';
  }

  if (typeof valueType === 'number') {
    return INT_TYPES.has(valueType);
  }

  return false;
}

export function schemaSaysString(valueType?: SchemaValueType): boolean {
  if (valueType == null) return false;

  if (typeof valueType === 'string') {
    return valueType.toUpperCase() === 'STRING';
  }

  if (typeof valueType === 'number') {
    return STRING_TYPES.has(valueType);
  }

  return false;
}

export function schemaSaysBool(valueType?: SchemaValueType): boolean {
  if (valueType == null) return false;

  if (typeof valueType === 'string') {
    return valueType.toUpperCase() === 'BOOL';
  }

  if (typeof valueType === 'number') {
    return BOOL_TYPES.has(valueType);
  }

  return false;
}

export function schemaSaysVector(valueType?: SchemaValueType): boolean {
  if (valueType == null) return false;

  if (typeof valueType === 'string') {
    return valueType.toUpperCase().startsWith('VECTOR');
  }

  if (typeof valueType === 'number') {
    return VECTOR_TYPES.has(valueType);
  }

  return false;
}

export function schemaSaysNumeric(valueType?: SchemaValueType): boolean {
  return schemaSaysFloat(valueType) || schemaSaysInt(valueType);
}
