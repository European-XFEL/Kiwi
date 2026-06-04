import { Hash, HashList, Schema } from './hash';
import { HashType } from './typenums';
import { decodeXML } from './xml_reader';
import { encodeXML } from './xml_writer';
import { unwrap, hashToDict, dictToHash, toBase64, fromBase64 } from './utils';

const stringFromSimple = (data: unknown) => String(unwrap(data));
const stringFromBool = (data: unknown) => (unwrap(data) ? '1' : '0');

const stringFromHash = (data: unknown) => {
  const value = unwrap(data);
  if (!(value instanceof Hash)) return String(value);
  return JSON.stringify(hashToDict(value));
};

const stringFromVectorHash = (data: unknown) => {
  const value = unwrap(data);
  if (!Array.isArray(value)) return String(value);
  return JSON.stringify(value.map((h) => hashToDict(unwrap(h) as Hash)));
};

const stringFromVector = (data: unknown) => {
  const value = unwrap(data);
  if (Array.isArray(value)) return value.map((x) => String(x)).join(',');

  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    return Array.from(value as unknown as Iterable<unknown>)
      .map((x) => String(x))
      .join(',');
  }

  return String(value);
};

const stringFromVectorChar = (data: unknown) => {
  const value = unwrap(data);
  if (value instanceof Uint8Array) return toBase64(value);
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    const view = value as ArrayBufferView;
    return toBase64(
      new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
    );
  }
  return String(value);
};

const stringFromVectorBool = (data: unknown) => {
  const value = unwrap(data);
  if (!Array.isArray(value)) return String(value);
  return value.map((i) => (i ? '1' : '0')).join(',');
};

const stringFromList = (data: unknown) => {
  const value = unwrap(data);
  if (!Array.isArray(value)) return String(value);
  return value.map((x) => String(x)).join(',');
};

const stringFromSchema = (data: unknown) => {
  const value = unwrap(data);
  if (!(value instanceof Schema)) return String(value);
  return `${value.name}:${encodeXML(value.hash)}`;
};

function resolveHashType(
  data: unknown,
  hashType?: HashType
): HashType | undefined {
  if (hashType !== undefined) return hashType;

  if (data && typeof data === 'object' && 'type_' in (data as object)) {
    return (data as { type_: HashType }).type_;
  }

  return undefined;
}

export function stringFromHashType(data: unknown, hashType?: HashType): string {
  const resolvedType = resolveHashType(data, hashType);

  switch (resolvedType) {
    case HashType.Bool:
      return stringFromBool(data);

    case HashType.VectorBool:
      return stringFromVectorBool(data);

    case HashType.VectorChar:
    case HashType.ByteArray:
      return stringFromVectorChar(data);

    case HashType.VectorInt8:
    case HashType.VectorInt16:
    case HashType.VectorInt32:
    case HashType.VectorInt64:
    case HashType.VectorUInt8:
    case HashType.VectorUInt16:
    case HashType.VectorUInt32:
    case HashType.VectorUInt64:
    case HashType.VectorFloat:
    case HashType.VectorDouble:
      return stringFromVector(data);

    case HashType.VectorString:
      return stringFromList(data);

    case HashType.Hash:
      return stringFromHash(data);

    case HashType.VectorHash:
      return stringFromVectorHash(data);

    case HashType.Schema:
      return stringFromSchema(data);

    case HashType.None_:
      return data == null ? 'None' : stringFromSimple(data);

    default:
      return stringFromSimple(data);
  }
}

const boolFromString = (s: string): boolean => Boolean(Number(s));
const passFromString = (s: string): string => s;

const noneFromString = (s: string): null => {
  if (s !== '' && s !== 'None') {
    throw new Error('Expected empty string or "None" for HashType.None_');
  }
  return null;
};

const numberFromString = (s: string): number => Number(s);
const bigintFromString = (s: string): bigint => BigInt(s.trim());

const vectorCharFromString = (s: string): Uint8Array => fromBase64(s);

const vectorFromString = (
  s: string,
  parser: (item: string) => unknown
): unknown[] => {
  if (!s) return [];
  return s
    .split(',')
    .map((ss) => ss.trim())
    .filter((ss) => ss.length > 0)
    .map(parser);
};

const hashFromString = (s: string): Hash => {
  const parsed = s ? (JSON.parse(s) as Record<string, unknown>) : {};
  return dictToHash(parsed);
};

const vectorHashFromString = (s: string): HashList => {
  const parsed = s ? (JSON.parse(s) as Record<string, unknown>[]) : [];
  return new HashList(parsed.map((d) => dictToHash(d)));
};

const listFromString = (s: string): string[] => {
  if (!s) return [];
  return s.split(',').map((ss) => ss.trim());
};

const schemaFromString = (s: string): Schema => {
  const [name, xml] = s.split(':', 2);
  return new Schema(name, decodeXML(xml) as Hash);
};

export function hashTypeFromString(
  hashType: HashType | number,
  data: string
): unknown {
  const type = Number(hashType) as HashType;

  switch (type) {
    case HashType.Bool:
      return boolFromString(data);

    case HashType.Char:
    case HashType.String:
      return passFromString(data);

    case HashType.Int8:
    case HashType.Int16:
    case HashType.Int32:
    case HashType.UInt8:
    case HashType.UInt16:
    case HashType.UInt32:
    case HashType.Float:
    case HashType.Double:
      return numberFromString(data);

    case HashType.Int64:
    case HashType.UInt64:
      return bigintFromString(data);

    case HashType.VectorBool:
      return vectorFromString(data, (x) => boolFromString(x));

    case HashType.VectorChar:
      return vectorCharFromString(data);

    case HashType.VectorInt8:
    case HashType.VectorInt16:
    case HashType.VectorInt32:
    case HashType.VectorUInt8:
    case HashType.VectorUInt16:
    case HashType.VectorUInt32:
    case HashType.VectorFloat:
    case HashType.VectorDouble:
      return vectorFromString(data, (x) => numberFromString(x));

    case HashType.VectorInt64:
    case HashType.VectorUInt64:
      return vectorFromString(data, (x) => bigintFromString(x));

    case HashType.Hash:
      return hashFromString(data);

    case HashType.VectorHash:
      return vectorHashFromString(data);

    case HashType.VectorString:
      return listFromString(data);

    case HashType.Schema:
      return schemaFromString(data);

    case HashType.None_:
      return noneFromString(data);

    case HashType.ByteArray:
      return vectorCharFromString(data);

    default:
      return passFromString(data);
  }
}
