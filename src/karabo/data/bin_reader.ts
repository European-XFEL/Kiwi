import * as Types from './types';
import { Hash, Schema, HashList, HashAttributes } from './hash';
// cannot import from the util module as it's a node-only module; in the browser,
// TextDecoder is a global object and should not be imported
// import { TextDecoder } from 'util';

// Calls decode complete strings without streaming, so decoder state is reset.
const stringDecoder = new TextDecoder('utf-8');
const keyDecoder = new TextDecoder('ascii');
const littleEndian = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

type ParserFunction = (
  parser: BinaryDecoder
) => Types.KaraboValue | Hash | HashList | Schema;

function readUInt8(parser: BinaryDecoder): Types.UInt8Value {
  parser.pos += 1;
  return new Types.UInt8Value(parser.dataview.getUint8(parser.pos - 1));
}

function readInt8(parser: BinaryDecoder): Types.Int8Value {
  parser.pos += 1;
  return new Types.Int8Value(parser.dataview.getInt8(parser.pos - 1));
}

function readUInt16(parser: BinaryDecoder): Types.UInt16Value {
  parser.pos += 2;
  return new Types.UInt16Value(parser.dataview.getUint16(parser.pos - 2, true));
}

function readInt16(parser: BinaryDecoder): Types.Int16Value {
  parser.pos += 2;
  return new Types.Int16Value(parser.dataview.getInt16(parser.pos - 2, true));
}

function readCount(parser: BinaryDecoder): number {
  parser.pos += 4;
  return parser.dataview.getUint32(parser.pos - 4, true);
}

function readUInt32(parser: BinaryDecoder): Types.UInt32Value {
  return new Types.UInt32Value(readCount(parser));
}

function readInt32(parser: BinaryDecoder): Types.Int32Value {
  parser.pos += 4;
  return new Types.Int32Value(parser.dataview.getInt32(parser.pos - 4, true));
}

function readUInt64(parser: BinaryDecoder): Types.UInt64Value {
  parser.pos += 8;
  const value = parser.dataview.getBigUint64(parser.pos - 8, true);
  return new Types.UInt64Value(value);
}

function readInt64(parser: BinaryDecoder): Types.Int64Value {
  parser.pos += 8;
  const value = parser.dataview.getBigInt64(parser.pos - 8, true);
  return new Types.Int64Value(value);
}

function readFloat32(parser: BinaryDecoder): Types.FloatValue {
  parser.pos += 4;
  return new Types.FloatValue(parser.dataview.getFloat32(parser.pos - 4, true));
}

function readFloat64(parser: BinaryDecoder): Types.DoubleValue {
  parser.pos += 8;
  return new Types.DoubleValue(
    parser.dataview.getFloat64(parser.pos - 8, true)
  );
}

function readBool(parser: BinaryDecoder): Types.BoolValue {
  parser.pos += 1;
  return new Types.BoolValue(parser.data[parser.pos - 1] === 1);
}

function readVectorBool(parser: BinaryDecoder): Types.VectorBoolValue {
  const size = readCount(parser);
  const start = parser.pos;
  parser.pos = start + size;
  const arr = new Array<boolean>(size);
  for (let i = 0; i < size; i++) {
    arr[i] = parser.data[start + i] > 0;
  }
  return new Types.VectorBoolValue(arr);
}

function readChar(parser: BinaryDecoder): Types.CharValue {
  parser.pos += 1;
  return new Types.CharValue(parser.data[parser.pos - 1]);
}

function readVectorChar(parser: BinaryDecoder): Types.VectorCharValue {
  const size = readCount(parser);
  parser.pos += size;
  return new Types.VectorCharValue(
    new Uint8Array(parser.data.subarray(parser.pos - size, parser.pos))
  );
}

function readStringText(parser: BinaryDecoder): string {
  const size = readCount(parser);
  const content = parser.data.subarray(parser.pos, parser.pos + size);
  const str = parser.string_encoder.decode(content);
  parser.pos += size;
  return str;
}

function readString(parser: BinaryDecoder): Types.StringValue {
  return new Types.StringValue(readStringText(parser));
}

function readVectorString(parser: BinaryDecoder): Types.VectorStringValue {
  const size = readCount(parser);
  const values = new Array<string>(size);
  for (let i = 0; i < size; i++) {
    values[i] = readStringText(parser);
  }
  return new Types.VectorStringValue(values);
}

// Copy wire bytes directly into owned vector storage on little-endian hosts.
// Byte copies support unaligned input; DataView handles other host byte orders.
function buildVectorReader<
  T extends number | bigint,
  V extends Types.NumericVectorTypes &
    Types.KaraboValue & { [index: number]: T },
>(
  byteWidth: number,
  readElement: (view: DataView, offset: number) => T,
  VectorValue: new (length: number) => V
) {
  return (parser: BinaryDecoder): V => {
    const size = readCount(parser);
    const byteLength = size * byteWidth;
    if (byteLength > parser.data.byteLength - parser.pos) {
      throw new RangeError('Truncated vector payload');
    }
    const values = new VectorValue(size);
    if (littleEndian || byteWidth === 1) {
      new Uint8Array(values.buffer, values.byteOffset, byteLength).set(
        parser.data.subarray(parser.pos, parser.pos + byteLength)
      );
      parser.pos += byteLength;
      return values;
    }
    for (let i = 0; i < size; i++) {
      values[i] = readElement(parser.dataview, parser.pos);
      parser.pos += byteWidth;
    }
    return values;
  };
}

function readSchema(parser: BinaryDecoder): Schema {
  const l = readCount(parser);
  const op = parser.pos;
  const nameSize = parser.data[parser.pos];
  parser.pos++;
  const content = parser.data.subarray(parser.pos, parser.pos + nameSize);
  const name = parser.string_encoder.decode(content);
  parser.pos += nameSize;
  const hsh = parser.readHash();
  if (parser.pos - op !== l) {
    throw new Error('Parser failed parsing Schema');
  }
  // Construct new Schema
  return new Schema(name, hsh);
}

function parserUndefined(_parser: BinaryDecoder, type: number): any {
  throw new Error(`Parser not Implemented ${type}`);
}

const parsers = [
  readBool, // Bool = 0
  readVectorBool, // VectorBool = 1
  readChar, // Char = 2
  readVectorChar, // VectorChar = 3
  readInt8, // Int8 = 4
  buildVectorReader(
    1,
    (view, offset) => view.getInt8(offset),
    Types.VectorInt8Value
  ), //  VectorInt8 = 5
  readUInt8, // UInt8 = 6
  buildVectorReader(
    1,
    (view, offset) => view.getUint8(offset),
    Types.VectorUInt8Value
  ), // VectorUInt8 = 7
  readInt16, // Int16 = 8
  buildVectorReader(
    2,
    (view, offset) => view.getInt16(offset, true),
    Types.VectorInt16Value
  ), // VectorInt16 = 9
  readUInt16, // UInt16 = 10
  buildVectorReader(
    2,
    (view, offset) => view.getUint16(offset, true),
    Types.VectorUInt16Value
  ), // VectorUInt16 = 11
  readInt32, // Int32 = 12
  buildVectorReader(
    4,
    (view, offset) => view.getInt32(offset, true),
    Types.VectorInt32Value
  ), // VectorInt32 = 13
  readUInt32, // UInt32 = 14
  buildVectorReader(
    4,
    (view, offset) => view.getUint32(offset, true),
    Types.VectorUInt32Value
  ), // VectorUInt32 = 15
  readInt64, // Int64 = 16
  buildVectorReader(
    8,
    (view, offset) => view.getBigInt64(offset, true),
    Types.VectorInt64Value
  ), // VectorInt64 = 17
  readUInt64, // UInt64 = 18
  buildVectorReader(
    8,
    (view, offset) => view.getBigUint64(offset, true),
    Types.VectorUInt64Value
  ), // VectorUInt64 = 19
  readFloat32, // Float = 20
  buildVectorReader(
    4,
    (view, offset) => view.getFloat32(offset, true),
    Types.VectorFloatValue
  ), // VectorFloat = 21
  readFloat64, // Double = 22
  buildVectorReader(
    8,
    (view, offset) => view.getFloat64(offset, true),
    Types.VectorDoubleValue
  ), // VectorDouble = 23
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

function getParser(typeNumber: number): ParserFunction {
  const parser = parsers[typeNumber];
  if (typeof parser != 'function') {
    throw new Error('failed to find parser for type ' + typeNumber);
  }
  return parser;
}

class BinaryDecoder {
  dataview: DataView;

  pos = 0;

  string_encoder = stringDecoder;

  key_decoder = keyDecoder;

  constructor(public data: Uint8Array) {
    this.dataview = new DataView(
      this.data.buffer,
      this.data.byteOffset,
      this.data.byteLength
    );
  }

  readKey(): string {
    const size = this.data[this.pos];
    const start = this.pos + 1;
    this.pos = start + size;
    return this.key_decoder.decode(this.data.subarray(start, this.pos));
  }

  read(): Hash {
    return this.readHash();
  }

  readVectorHash(): HashList {
    const size = readCount(this);
    const ret = new HashList();
    for (let i = 0; i < size; i++) {
      ret[i] = this.readHash();
    }
    return ret;
  }

  readHash(): Hash {
    let size = readCount(this);
    const hash = new Hash();

    while (size > 0) {
      const key = this.readKey();
      const hashType = readCount(this);

      let asize = readCount(this);

      // Collect attributes into a Map for the new Hash
      // This is fine since we pollute with KaraboValues
      //
      const attrs = new HashAttributes();
      while (asize > 0) {
        const attrKey = this.readKey();
        const attrType = readCount(this);
        const attrValue = getParser(attrType)(this);
        attrs._set_element(attrKey, attrValue);
        asize -= 1;
      }

      // Read the main value
      const value = getParser(hashType)(this);

      // Use setElement to properly populate the HashNode with data and attributes
      hash.setElement(key, value, attrs);

      size -= 1;
    }
    return hash;
  }

  readSchema(): Schema {
    return readSchema(this);
  }
}

function decodeBinary(bin_hash: Uint8Array): Hash {
  const parser = new BinaryDecoder(bin_hash);
  const data = parser.read();
  return data;
}

function decodeBinarySchema(bin_hash: Uint8Array): Schema {
  const parser = new BinaryDecoder(bin_hash);
  const data = parser.readSchema();
  return data;
}

export { decodeBinary, decodeBinarySchema };
