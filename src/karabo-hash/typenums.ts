export enum HashTypes {
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
  Float32 = 20,
  VectorFloat32 = 21,
  Float64 = 22,
  VectorFloat64 = 23,
  String = 28,
  VectorString = 29,
  Hash = 30,
  VectorHash = 31,
  Schema = 32,
  None_ = 35,
  ByteArray = 37,
}

export function getHashTypeFromValue(value: any): HashTypes {
  if (value instanceof Uint8Array) {
    return HashTypes.VectorChar;
  }
  switch (typeof value) {
    case 'string': {
      return HashTypes.String;
    }
    case 'boolean': {
      return HashTypes.Bool;
    }
    case 'bigint': {
      return HashTypes.Int64;
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
          return HashTypes.VectorString;
        }
        const first = value[0];
        switch (typeof first) {
          case 'string': {
            return HashTypes.VectorString;
          }
          case 'number': {
            return _getNumberVector(first);
          }
          case 'boolean': {
            return HashTypes.VectorBool;
          }
          case 'bigint': {
            return HashTypes.VectorInt32;
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
    `Cannot infer HashTypes from value: ${Object.prototype.toString.call(value)}`
  );
}

function _getNumberType(value: number): HashTypes {
  if (Number.isInteger(value)) {
    return HashTypes.Int32;
  } else {
    return HashTypes.Float64;
  }
}

function _getNumberVector(value: number): HashTypes {
  if (Number.isInteger(value)) {
    return HashTypes.VectorInt32;
  } else {
    return HashTypes.VectorFloat64;
  }
}

export const HashTypeToXmlType: Record<HashTypes, string> = {
  [HashTypes.Bool]: 'BOOL',
  [HashTypes.VectorBool]: 'VECTOR_BOOL',
  [HashTypes.Char]: 'CHAR',
  [HashTypes.VectorChar]: 'VECTOR_CHAR',
  [HashTypes.Int8]: 'INT8',
  [HashTypes.VectorInt8]: 'VECTOR_INT8',
  [HashTypes.UInt8]: 'UINT8',
  [HashTypes.VectorUInt8]: 'VECTOR_UINT8',
  [HashTypes.Int16]: 'INT16',
  [HashTypes.VectorInt16]: 'VECTOR_INT16',
  [HashTypes.UInt16]: 'UINT16',
  [HashTypes.VectorUInt16]: 'VECTOR_UINT16',
  [HashTypes.Int32]: 'INT32',
  [HashTypes.VectorInt32]: 'VECTOR_INT32',
  [HashTypes.UInt32]: 'UINT32',
  [HashTypes.VectorUInt32]: 'VECTOR_UINT32',
  [HashTypes.Int64]: 'INT64',
  [HashTypes.VectorInt64]: 'VECTOR_INT64',
  [HashTypes.UInt64]: 'UINT64',
  [HashTypes.VectorUInt64]: 'VECTOR_UINT64',
  [HashTypes.Float32]: 'FLOAT',
  [HashTypes.VectorFloat32]: 'VECTOR_FLOAT',
  [HashTypes.Float64]: 'DOUBLE',
  [HashTypes.VectorFloat64]: 'VECTOR_DOUBLE',
  [HashTypes.String]: 'STRING',
  [HashTypes.VectorString]: 'VECTOR_STRING',
  [HashTypes.Hash]: 'HASH',
  [HashTypes.VectorHash]: 'VECTOR_HASH',
  [HashTypes.ByteArray]: 'BYTE_ARRAY',
  [HashTypes.Schema]: 'SCHEMA',
  [HashTypes.None_]: 'NONE',
};

export const XmlTypeToHashType: Record<string, HashTypes> = Object.entries(
  HashTypeToXmlType
).reduce(
  (acc, [enumValue, xmlString]) => {
    acc[xmlString] = Number(enumValue) as HashTypes;
    return acc;
  },
  {} as Record<string, HashTypes>
);
