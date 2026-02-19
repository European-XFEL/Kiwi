import * as Types from './types';
import { Hash, Schema, HashList } from './hash';

function encodeInt8(parser: BinaryEncoder, data: number): ArrayBuffer {
  const bin = new ArrayBuffer(1);
  const dv = new DataView(bin);
  dv.setInt8(0, data);
  return bin;
}

function encodeChar(parser: BinaryEncoder, data: number): ArrayBuffer {
  const bin = new ArrayBuffer(1);
  const dv = new DataView(bin);
  dv.setUint8(0, data);
  return bin;
}

function encodeUInt8(parser: BinaryEncoder, data: number): ArrayBuffer {
  const bin = new ArrayBuffer(1);
  const dv = new DataView(bin);
  dv.setUint8(0, data);
  return bin;
}

function encodeInt16(parser: BinaryEncoder, data: number): ArrayBuffer {
  const bin = new ArrayBuffer(2);
  const dv = new DataView(bin);
  dv.setInt16(0, data, true);
  return bin;
}

function encodeUInt16(parser: BinaryEncoder, data: number): ArrayBuffer {
  const bin = new ArrayBuffer(2);
  const dv = new DataView(bin);
  dv.setUint16(0, data, true);
  return bin;
}

function encodeInt32(parser: BinaryEncoder, data: number): ArrayBuffer {
  const bin = new ArrayBuffer(4);
  const dv = new DataView(bin);
  dv.setInt32(0, data, true);
  return bin;
}

function encodeUInt32(parser: BinaryEncoder, data: number): ArrayBuffer {
  const bin = new ArrayBuffer(4);
  const dv = new DataView(bin);
  dv.setUint32(0, data, true);
  return bin;
}

function encodeInt64(parser: BinaryEncoder, data: bigint): ArrayBuffer {
  const bin = new ArrayBuffer(8);
  const dv = new DataView(bin);
  dv.setBigInt64(0, data, true);
  return bin;
}

function encodeUInt64(parser: BinaryEncoder, data: bigint): ArrayBuffer {
  const bin = new ArrayBuffer(8);
  const dv = new DataView(bin);
  dv.setBigUint64(0, data, true);
  return bin;
}

function encodeFloat32(parser: BinaryEncoder, data: number): ArrayBuffer {
  const bin = new ArrayBuffer(4);
  const dv = new DataView(bin);
  dv.setFloat32(0, data, true);
  return bin;
}

function encodeFloat64(parser: BinaryEncoder, data: number): ArrayBuffer {
  const bin = new ArrayBuffer(8);
  const dv = new DataView(bin);
  dv.setFloat64(0, data, true);
  return bin;
}

function encodeBoolean(parser: BinaryEncoder, data: boolean): ArrayBuffer {
  const bin = new ArrayBuffer(1);
  const dv = new DataView(bin);
  dv.setUint8(0, data ? 1 : 0);
  return bin;
}

function encodeString(parser: BinaryEncoder, data: string): ArrayBuffer {
  const buff = parser.encoder.encode(data);
  const ret = new Uint8Array(buff.length + 4);
  const dv = new DataView(ret.buffer);
  dv.setUint32(0, buff.length, true);
  ret.set(new Uint8Array(buff), 4);
  return ret.buffer;
}

function encodeVector<T>(
  parser: BinaryEncoder,
  data: T[],
  encoderFn: (parser: BinaryEncoder, item: T) => ArrayBuffer
): ArrayBuffer {
  // 1. Encode all elements to buffers
  const elementBuffers = data.map((element) => encoderFn(parser, element));

  // 2. Calculate total size: 4 bytes (uint32 size) + sum of all element buffers
  let totalSize = 4;
  for (const buffer of elementBuffers) {
    totalSize += buffer.byteLength;
  }

  // 3. Allocate and fill result buffer
  const ret = new Uint8Array(totalSize);
  const dv = new DataView(ret.buffer);

  // Set vector length
  dv.setUint32(0, data.length, true);

  // Write elements
  let offset = 4;
  for (const buffer of elementBuffers) {
    ret.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }

  return ret.buffer;
}

class BinaryEncoder {
  encoder = new TextEncoder();

  constructor() {}

  encodeValue(
    value: Types.KaraboValue | Hash | HashList | Schema
  ): ArrayBuffer {
    if (value instanceof Types.BoolValue) {
      return encodeBoolean(this, value.value_);
    } else if (value instanceof Types.VectorBoolValue) {
      return encodeVector(this, value.value_, encodeBoolean);
    } else if (value instanceof Types.CharValue) {
      return encodeChar(this, value.value_);
    } else if (value instanceof Types.VectorCharValue) {
      return encodeVector(this, Array.from(value.value_), encodeChar);
    } else if (value instanceof Types.Int8Value) {
      return encodeInt8(this, value.value_);
    } else if (value instanceof Types.VectorInt8Value) {
      return encodeVector(this, value.value_, encodeInt8);
    } else if (value instanceof Types.UInt8Value) {
      return encodeUInt8(this, value.value_);
    } else if (value instanceof Types.VectorUInt8Value) {
      return encodeVector(this, value.value_, encodeUInt8);
    } else if (value instanceof Types.Int16Value) {
      return encodeInt16(this, value.value_);
    } else if (value instanceof Types.VectorInt16Value) {
      return encodeVector(this, value.value_, encodeInt16);
    } else if (value instanceof Types.UInt16Value) {
      return encodeUInt16(this, value.value_);
    } else if (value instanceof Types.VectorUInt16Value) {
      return encodeVector(this, value.value_, encodeUInt16);
    } else if (value instanceof Types.Int32Value) {
      return encodeInt32(this, value.value_);
    } else if (value instanceof Types.VectorInt32Value) {
      return encodeVector(this, value.value_, encodeInt32);
    } else if (value instanceof Types.UInt32Value) {
      return encodeUInt32(this, value.value_);
    } else if (value instanceof Types.VectorUInt32Value) {
      return encodeVector(this, value.value_, encodeUInt32);
    } else if (value instanceof Types.Int64Value) {
      return encodeInt64(this, BigInt(value.value_));
    } else if (value instanceof Types.VectorInt64Value) {
      return encodeVector(this, value.value_, (p, v) =>
        encodeInt64(p, BigInt(v))
      );
    } else if (value instanceof Types.UInt64Value) {
      return encodeUInt64(this, BigInt(value.value_));
    } else if (value instanceof Types.VectorUInt64Value) {
      return encodeVector(this, value.value_, (p, v) =>
        encodeUInt64(p, BigInt(v))
      );
    } else if (value instanceof Types.FloatValue) {
      return encodeFloat32(this, value.value_);
    } else if (value instanceof Types.VectorFloatValue) {
      return encodeVector(this, value.value_, encodeFloat32);
    } else if (value instanceof Types.DoubleValue) {
      return encodeFloat64(this, value.value_);
    } else if (value instanceof Types.VectorDoubleValue) {
      return encodeVector(this, value.value_, encodeFloat64);
    } else if (value instanceof Types.StringValue) {
      return encodeString(this, value.value_);
    } else if (value instanceof Types.VectorStringValue) {
      return encodeVector(this, value.value_, encodeString);
    } else if (value instanceof Hash) {
      return this.encodeHash(value);
    } else if (value instanceof HashList) {
      return encodeVector(this, value.value_, (p, h) => p.encodeHash(h));
    } else if (value instanceof Schema) {
      return this.encodeSchema(value);
    }

    throw new Error(
      `failed to encode type ${(value as any).type_} ${JSON.stringify(value)}`
    );
  }

  encodeKey(key: string): ArrayBuffer {
    const buff = this.encoder.encode(key);
    const ret = new Uint8Array(buff.length + 1);
    const dv = new DataView(ret.buffer);
    ret.set(new Uint8Array(buff), 1);
    dv.setUint8(0, buff.length);
    return ret.buffer;
  }

  encodeHash(hash: Hash): ArrayBuffer {
    const buffers: ArrayBuffer[] = [new ArrayBuffer(4)]; // Placeholder for key count
    let totalSize = 4;
    let keyCount = 0;

    for (const [key, node] of hash) {
      keyCount += 1;
      const { data, attrs } = node;

      // 1. Write Key
      const keyBuff = this.encodeKey(key);
      totalSize += keyBuff.byteLength;
      buffers.push(keyBuff);

      // 2. Write Type (from the data in HashNode)
      buffers.push(encodeUInt32(this, data.type_));
      totalSize += 4;

      // 3. Write Attributes Count
      const attrCountBuff = encodeUInt32(this, attrs.size);
      buffers.push(attrCountBuff);
      totalSize += 4;

      // 4. Write Attributes
      for (const [attrsKey, attrValue] of attrs) {
        // Attr Key
        const ak = this.encodeKey(attrsKey);
        buffers.push(ak);
        totalSize += ak.byteLength;

        // Attr Type
        buffers.push(encodeUInt32(this, (attrValue as any).type_));
        totalSize += 4;

        // Attr Value
        const av = this.encodeValue(attrValue as any);
        buffers.push(av);
        totalSize += av.byteLength;
      }

      // 5. Write Value
      const valueBuff = this.encodeValue(data as any);
      buffers.push(valueBuff);
      totalSize += valueBuff.byteLength;
    }

    // Set the total key number at the start
    new DataView(buffers[0]).setUint32(0, keyCount, true);

    // Concat all buffers
    const ret = new Uint8Array(totalSize);
    let pos = 0;
    buffers.forEach((element) => {
      ret.set(new Uint8Array(element), pos);
      pos += element.byteLength;
    });

    return ret.buffer;
  }

  encodeSchema(schema: Schema): ArrayBuffer {
    const buffers: ArrayBuffer[] = [new ArrayBuffer(4)]; // Placeholder for total size
    let totalSize = 0;

    // 1. Schema Name
    const nameBuff = this.encodeKey(schema.name);
    totalSize += nameBuff.byteLength;
    buffers.push(nameBuff);

    // 2. Schema Hash (using the new Hash encoder)
    const hashBuff = this.encodeHash(schema.hash);
    totalSize += hashBuff.byteLength;
    buffers.push(hashBuff);

    // Write total size at the beginning
    new DataView(buffers[0]).setUint32(0, totalSize, true);

    // Concat all
    const ret = new Uint8Array(totalSize + 4);
    let pos = 0;
    buffers.forEach((element) => {
      ret.set(new Uint8Array(element), pos);
      pos += element.byteLength;
    });
    return ret.buffer;
  }
}

function encodeBinary(hash: Hash): ArrayBuffer {
  const encoder = new BinaryEncoder();
  const data = encoder.encodeHash(hash);
  return data;
}

function encodeBinarySchema(schema: Schema): ArrayBuffer {
  const encoder = new BinaryEncoder();
  const data = encoder.encodeSchema(schema);
  return data;
}

export { encodeBinary, encodeBinarySchema };
