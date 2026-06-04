export enum HashType {
  Bool = 0,
  VectorBool = 1,
  Char = 2,
  VectorChar = 3,
  Int8 = 4,
  VectorInt8 = 5,
  UInt8 = 6,
  VectorUInt8 = 7,
  Int16 = 8,
  VectorInt16 = 9,
  UInt16 = 10,
  VectorUInt16 = 11,
  Int32 = 12,
  VectorInt32 = 13,
  UInt32 = 14,
  VectorUInt32 = 15,
  Int64 = 16,
  VectorInt64 = 17,
  UInt64 = 18,
  VectorUInt64 = 19,
  Float = 20,
  VectorFloat = 21,
  Double = 22,
  VectorDouble = 23,
  String = 28,
  VectorString = 29,
  Hash = 30,
  VectorHash = 31,
  Schema = 32,
  None_ = 35,
  ByteArray = 37,
}

export function getHashTypeFromValue(value: any): HashType {
  if (value instanceof Uint8Array) {
    return HashType.VectorChar;
  }
  switch (typeof value) {
    case 'string': {
      return HashType.String;
    }
    case 'boolean': {
      return HashType.Bool;
    }
    case 'bigint': {
      return HashType.Int64;
    }
    case 'number': {
      return _getNumberType(value);
    }
    case 'object': {
      if (Object.prototype.hasOwnProperty.call(value, 'type_')) {
        return value.type_;
      }

      if (Array.isArray(value)) {
        if (value.length === 0) {
          return HashType.VectorString;
        }
        const first = value[0];
        switch (typeof first) {
          case 'string': {
            return HashType.VectorString;
          }
          case 'number': {
            return _getNumberVector(first);
          }
          case 'boolean': {
            return HashType.VectorBool;
          }
          case 'bigint': {
            return HashType.VectorInt64;
          }
          default: {
            break;
          }
        }
      }
      break;
    }
  }

  throw new Error(
    `Cannot infer HashType from value: ${Object.prototype.toString.call(value)}`
  );
}

function _getNumberType(value: number): HashType {
  if (Number.isInteger(value)) {
    return HashType.Int32;
  } else {
    return HashType.Double;
  }
}

function _getNumberVector(value: number): HashType {
  if (Number.isInteger(value)) {
    return HashType.VectorInt32;
  } else {
    return HashType.VectorDouble;
  }
}

export const HashTypeToXmlType: Record<HashType, string> = {
  [HashType.Bool]: 'BOOL',
  [HashType.VectorBool]: 'VECTOR_BOOL',
  [HashType.Char]: 'CHAR',
  [HashType.VectorChar]: 'VECTOR_CHAR',
  [HashType.Int8]: 'INT8',
  [HashType.VectorInt8]: 'VECTOR_INT8',
  [HashType.UInt8]: 'UINT8',
  [HashType.VectorUInt8]: 'VECTOR_UINT8',
  [HashType.Int16]: 'INT16',
  [HashType.VectorInt16]: 'VECTOR_INT16',
  [HashType.UInt16]: 'UINT16',
  [HashType.VectorUInt16]: 'VECTOR_UINT16',
  [HashType.Int32]: 'INT32',
  [HashType.VectorInt32]: 'VECTOR_INT32',
  [HashType.UInt32]: 'UINT32',
  [HashType.VectorUInt32]: 'VECTOR_UINT32',
  [HashType.Int64]: 'INT64',
  [HashType.VectorInt64]: 'VECTOR_INT64',
  [HashType.UInt64]: 'UINT64',
  [HashType.VectorUInt64]: 'VECTOR_UINT64',
  [HashType.Float]: 'FLOAT',
  [HashType.VectorFloat]: 'VECTOR_FLOAT',
  [HashType.Double]: 'DOUBLE',
  [HashType.VectorDouble]: 'VECTOR_DOUBLE',
  [HashType.String]: 'STRING',
  [HashType.VectorString]: 'VECTOR_STRING',
  [HashType.Hash]: 'HASH',
  [HashType.VectorHash]: 'VECTOR_HASH',
  [HashType.ByteArray]: 'BYTE_ARRAY',
  [HashType.Schema]: 'SCHEMA',
  [HashType.None_]: 'NONE',
};

export const XmlTypeToHashType: Record<string, HashType> = Object.entries(
  HashTypeToXmlType
).reduce(
  (acc, [enumValue, xmlString]) => {
    acc[xmlString] = Number(enumValue) as HashType;
    return acc;
  },
  {} as Record<string, HashType>
);
