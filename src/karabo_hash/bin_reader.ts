/*
 * Binary decoder for the Karabo Hash type.
 *
 * Created on September, 2021.
 *
 * Author: alessandro.silenzi@xfel.eu
 *
 * Copyright (C) European XFEL GmbH Hamburg. All rights reserved.
 */

import * as Types from "./types";

function readUInt8(parser: BinaryDecoder): Types.UInt8 {
  parser.pos += 1;
  return new Types.UInt8(parser.dataview.getUint8(parser.pos - 1));
}

function readInt8(parser: BinaryDecoder): Types.Int8 {
  parser.pos += 1;
  return new Types.Int8(parser.dataview.getInt8(parser.pos - 1));
}

function readUInt16(parser: BinaryDecoder): Types.UInt16 {
  parser.pos += 2;
  return new Types.UInt16(parser.dataview.getUint16(parser.pos - 2, true));
}

function readInt16(parser: BinaryDecoder): Types.Int16 {
  parser.pos += 2;
  return new Types.Int16(parser.dataview.getInt16(parser.pos - 2, true));
}

function readUInt32(parser: BinaryDecoder): Types.UInt32 {
  parser.pos += 4;
  const value = parser.dataview.getUint32(parser.pos - 4, true);
  return new Types.UInt32(value);
}

function readInt32(parser: BinaryDecoder): Types.Int32 {
  parser.pos += 4;
  return new Types.Int32(parser.dataview.getInt32(parser.pos - 4, true));
}

function readUInt64(parser: BinaryDecoder): Types.UInt64 {
  parser.pos += 8;
  const value = parser.dataview.getBigUint64(parser.pos - 8, true);
  return new Types.UInt64(value);
}

function readInt64(parser: BinaryDecoder): Types.Int64 {
  parser.pos += 8;
  const value = parser.dataview.getBigInt64(parser.pos - 8, true);
  return new Types.Int64(value);
}

function readFloat32(parser: BinaryDecoder): Types.Float32 {
  parser.pos += 4;
  return new Types.Float32(parser.dataview.getFloat32(parser.pos - 4, true));
}

function readFloat64(parser: BinaryDecoder): Types.Float64 {
  parser.pos += 8;
  return new Types.Float64(parser.dataview.getFloat64(parser.pos - 8, true));
}

function readBool(parser: BinaryDecoder): Types.Bool {
  parser.pos += 1;
  return new Types.Bool(parser.data[parser.pos - 1] === 0);
}

// function readVectorBool(parser: BinaryDecoder): boolean[] {
//   const size = readUInt32(parser).value;
//   const start = parser.pos;
//   parser.pos = start + size;
//   const arr = new Array<boolean>(size);
//   parser.data.slice(start, parser.pos).forEach((element, index) => {
//     if (element > 0) {
//       arr[index] = true;
//     } else {
//       arr[index] = false;
//     }
//   });
//   return arr;
// }

function readChar(parser: BinaryDecoder): Types.String {
  parser.pos += 1;
  return new Types.String(String.fromCharCode(parser.data[parser.pos - 1]));
}

function readVectorChar(parser: BinaryDecoder): Uint8Array {
  const size = readUInt32(parser).value;
  parser.pos += size;
  return parser.data.slice(parser.pos - size, parser.pos - 1);
}

function readString(parser: BinaryDecoder): Types.String {
  const size = readUInt32(parser).value;
  const content = parser.data.slice(parser.pos, parser.pos + size);
  const str = parser.string_encoder.decode(content);
  parser.pos += size;
  return new Types.String(str);
}

function readVectorString(parser: BinaryDecoder): Types.VectorString {
  let size = readUInt32(parser).value;
  const res = new Types.VectorString([]);
  while (size > 0) {
    const element = readString(parser);
    res.value_.push(element.value_);
    size -= 1;
  }
  return res;
}

// this is not ideal, we should figure out a way to
function makeVectorReader(elementReader: any, klass: any) {
  return (parser: BinaryDecoder) => {
    let size = readUInt32(parser).value;
    const slice_ = [];
    while (size > 0) {
      const element = elementReader(parser);
      slice_.push(element.value);
      size -= 1;
    }
    return new klass(slice_);
  };
}

// function readVector<T>(
//   parser: BinaryDecoder,
//   elementReader: (parser: BinaryDecoder) => T
// ): T[] {
//   let size = readUInt32(parser).value;
//   const ret: T[] = [];
//   while (size >= 0) {
//     ret.push(elementReader(parser));
//     size -= 1;
//   }
//   return ret;
// }

function readSchema(parser: BinaryDecoder): Types.Schema {
  const l = readUInt32(parser).value;
  const op = parser.pos;
  const nameSize = parser.data[parser.pos];
  parser.pos++;
  const content = parser.data.slice(parser.pos, parser.pos + nameSize);
  const name = parser.string_encoder.decode(content);
  parser.pos += nameSize;
  const hsh = parser.readHash();
  if (parser.pos - op !== l) {
    throw new Error("Parser failed parsing Schema");
  }
  return new Types.Schema({ name, hash: hsh.value });
}

function parserUndefined(parser: BinaryDecoder, type: number): Types.Hash {
  throw new Error(`Parser not Implemented ${type}`);
}

const parsers = [
  readBool, // Bool = 0
  makeVectorReader(readBool, Types.VectorBool), // readVectorBool, // VectorBool = 1
  readChar, // Char = 2
  readVectorChar, // VectorChar = 3
  readInt8, // Int8 = 4
  makeVectorReader(readInt8, Types.VectorInt8), //  VectorInt8 = 5
  readUInt8, // UInt8 = 6
  makeVectorReader(readUInt8, Types.VectorUInt8), // VectorUInt8 = 7
  readInt16, // Int16 = 8
  makeVectorReader(readInt16, Types.VectorInt16), // VectorInt16 = 9
  readUInt16, // UInt16 = 10
  makeVectorReader(readUInt16, Types.VectorUInt16), // VectorUInt16 = 11
  readInt32, // Int32 = 12
  makeVectorReader(readInt32, Types.VectorInt32), // VectorInt32 = 13
  readUInt32, // UInt32 = 14
  makeVectorReader(readUInt32, Types.VectorUInt32), // VectorUInt32 = 15
  readInt64, // Int64 = 16
  makeVectorReader(readInt64, Types.VectorInt64), // VectorInt64 = 17
  readUInt64, // UInt64 = 18
  makeVectorReader(readUInt64, Types.VectorUInt64), // VectorUInt64 = 19
  readFloat32, // Float = 20
  makeVectorReader(readFloat32, Types.VectorFloat32), // VectorFloat = 21
  readFloat64, // Double = 22
  makeVectorReader(readFloat64, Types.VectorFloat64), // VectorDouble = 23
  (p: BinaryDecoder) => parserUndefined(p, 24), // ComplexFloat = 24
  (p: BinaryDecoder) => parserUndefined(p, 25), // VectorComplexFloat = 25
  (p: BinaryDecoder) => parserUndefined(p, 26), // ComplexDouble = 26
  (p: BinaryDecoder) => parserUndefined(p, 27), // VectorComplexDouble = 27
  readString, // String = 28
  readVectorString, // VectorString = 29
  (p: BinaryDecoder) => p.readHash(), // Hash = 30
  (p: BinaryDecoder) => p.readVectorHash(), // VectorHash = 31
  readSchema, // Schema = 32
  (p: BinaryDecoder) => parserUndefined(p, 33), // missing 33
  (p: BinaryDecoder) => parserUndefined(p, 34), // missing 34
  (p: BinaryDecoder) => parserUndefined(p, 35), // None_ = 35
  (p: BinaryDecoder) => parserUndefined(p, 36), // missing 36
  readVectorChar, // ByteArray = 37
];

class BinaryDecoder {
  dataview: DataView;

  pos = 0;

  string_encoder = new TextDecoder("utf-8");

  key_decoder = new TextDecoder("ascii");

  constructor(public data: Uint8Array) {
    this.dataview = new DataView(this.data.buffer);
  }

  readKey(): string {
    const size = this.data[this.pos];
    const start = this.pos + 1;
    this.pos = start + size;
    return this.key_decoder.decode(this.data.slice(start, this.pos));
  }

  read(): Types.Hash {
    return this.readHash();
  }

  readVectorHash(): Types.Hash[] {
    let size = readUInt32(this).value;
    const ret: Types.Hash[] = [];
    while (size > 0) {
      ret.push(this.readHash());
      size -= 1;
    }
    return ret;
  }

  readHash(): Types.Hash {
    let size = readUInt32(this).value;
    const ret: Types.HashValue = {};
    while (size > 0) {
      const key = this.readKey();
      const hashType = readUInt32(this).value;
      let asize = readUInt32(this).value;
      const attrs: Types.Attributes = {};
      while (asize > 0) {
        const attrKey = this.readKey();
        const attrType = readUInt32(this).value;
        const attrValue = parsers[attrType](this);
        attrs[attrKey] = attrValue;
        asize -= 1;
      }
      const value = parsers[hashType](this);
      ret[key] = { value, attrs };
      size -= 1;
    }
    return new Types.Hash(ret);
  }
}

export default BinaryDecoder;
