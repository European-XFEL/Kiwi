/**
 * schema_type_identifiers
 *
 * HashTypes-first type identification.
 *
 * This file intentionally does NOT format values.
 * It only answers "what does the schema say?"
 */

import { HashTypes } from '@/karabo-hash/typenums';

// Runtime groups (HashTypes-based)
const FLOAT_TYPES = new Set<HashTypes>([HashTypes.Float32, HashTypes.Float64]);

const INT_TYPES = new Set<HashTypes>([
  HashTypes.Int8,
  HashTypes.Int16,
  HashTypes.Int32,
  HashTypes.Int64,
  HashTypes.UInt8,
  HashTypes.UInt16,
  HashTypes.UInt32,
  HashTypes.UInt64,
]);

const STRING_TYPES = new Set<HashTypes>([HashTypes.String]);
const BOOL_TYPES = new Set<HashTypes>([HashTypes.Bool]);

const VECTOR_TYPES = new Set<HashTypes>([
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

const isSetMember = (set: ReadonlySet<HashTypes>, valueType?: HashTypes) =>
  valueType != null && set.has(valueType);

export const schemaSaysFloat = (valueType?: HashTypes) =>
  isSetMember(FLOAT_TYPES, valueType);

export const schemaSaysInt = (valueType?: HashTypes) =>
  isSetMember(INT_TYPES, valueType);

export const schemaSaysString = (valueType?: HashTypes) =>
  isSetMember(STRING_TYPES, valueType);

export const schemaSaysBool = (valueType?: HashTypes) =>
  isSetMember(BOOL_TYPES, valueType);

export const schemaSaysVector = (valueType?: HashTypes) =>
  isSetMember(VECTOR_TYPES, valueType);

export const schemaSaysNumeric = (valueType?: HashTypes) =>
  schemaSaysFloat(valueType) || schemaSaysInt(valueType);
