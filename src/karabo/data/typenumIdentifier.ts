/**
 * schema_type_identifiers
 *
 * HashType-first type identification.
 *
 * This file intentionally does NOT format values.
 * It only answers "what does the schema say?"
 */

import { HashType } from '@/karabo/data/typenums';

// Runtime groups (HashType-based)
const FLOAT_TYPES = new Set<HashType>([HashType.Float, HashType.Double]);

const INT_TYPES = new Set<HashType>([
  HashType.Int8,
  HashType.Int16,
  HashType.Int32,
  HashType.Int64,
  HashType.UInt8,
  HashType.UInt16,
  HashType.UInt32,
  HashType.UInt64,
]);

const STRING_TYPES = new Set<HashType>([HashType.String]);
const BOOL_TYPES = new Set<HashType>([HashType.Bool]);

const VECTOR_TYPES = new Set<HashType>([
  HashType.VectorBool,
  HashType.VectorChar,
  HashType.VectorFloat,
  HashType.VectorDouble,
  HashType.VectorInt8,
  HashType.VectorInt16,
  HashType.VectorInt32,
  HashType.VectorInt64,
  HashType.VectorString,
  HashType.VectorUInt8,
  HashType.VectorUInt16,
  HashType.VectorUInt32,
  HashType.VectorUInt64,
  HashType.VectorHash,
]);

const isSetMember = (set: ReadonlySet<HashType>, hashType?: HashType) =>
  hashType != null && set.has(hashType);

export const isHashFloat = (hashType?: HashType) =>
  isSetMember(FLOAT_TYPES, hashType);

export const isHashInteger = (hashType?: HashType) =>
  isSetMember(INT_TYPES, hashType);

export const isHashString = (hashType?: HashType) =>
  isSetMember(STRING_TYPES, hashType);

export const isHashBool = (hashType?: HashType) =>
  isSetMember(BOOL_TYPES, hashType);

export const isHashVector = (hashType?: HashType) =>
  isSetMember(VECTOR_TYPES, hashType);

export const isHashNumber = (hashType?: HashType) =>
  isHashFloat(hashType) || isHashInteger(hashType);
