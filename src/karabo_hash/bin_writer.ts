/*
 * Binary encoder for the Karabo Hash type.
 *
 * Created on September, 2021.
 *
 * Author: alessandro.silenzi@xfel.eu
 *
 * Copyright (C) European XFEL GmbH Hamburg. All rights reserved.
 */

import * as Types from "./types";

function encodeInt8(parser: BinaryEncoder, data: number): ArrayBuffer {
  const bin = new ArrayBuffer(1);
  const dv = new DataView(bin);
  dv.setInt8(0, data);
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
  const bin = new ArrayBuffer(5);
  const dv = new DataView(bin);
  dv.setUint8(0, Types.HashTypes.Float32);
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
  return ret;
}

class BinaryEncoder {
  encoder = new TextEncoder();

  constructor(public data: Types.Hash) {}

  encodeValue(value: Types.KaraboType): ArrayBuffer {
    switch (value.type_) {
      case Types.HashTypes.Bool:
        return encodeBoolean(this, value.value_);
      case Types.HashTypes.Int8:
        return encodeInt8(this, value.value_);
      case Types.HashTypes.UInt8:
        return encodeUInt8(this, value.value_);
      case Types.HashTypes.Int16:
        return encodeInt16(this, value.value_);
      case Types.HashTypes.UInt16:
        return encodeUInt16(this, value.value_);
      case Types.HashTypes.Int32:
        return encodeInt32(this, value.value_);
      case Types.HashTypes.UInt32:
        return encodeUInt32(this, value.value_);
      case Types.HashTypes.Int64:
        return encodeInt64(this, BigInt(value.value_));
      case Types.HashTypes.UInt64:
        return encodeUInt64(this, BigInt(value.value_));
      case Types.HashTypes.Float32:
        return encodeFloat32(this, value.value_);
      case Types.HashTypes.Float64:
        return encodeFloat64(this, value.value_);
      case Types.HashTypes.String:
        return encodeString(this, value.value_);
      case Types.HashTypes.Hash:
        return this.encodeHash(value.value_);
      default:
        return new ArrayBuffer(0);
    }
  }

  encode(): ArrayBuffer {
    return this.encodeHash(this.data);
  }

  encodeKey(key: string): ArrayBuffer {
    const buff = this.encoder.encode(key);
    const ret = new Uint8Array(buff.length + 1);
    const dv = new DataView(ret.buffer);
    ret.set(new Uint8Array(buff), 1);
    dv.setUint8(0, buff.length);
    return ret;
  }

  encodeHash(data: Types.Hash): ArrayBuffer {
    const hashValue = data.value;
    const buffers: ArrayBuffer[] = [new ArrayBuffer(4)];
    let totalSize = 4;
    let keyCount = 0;
    Object.keys(hashValue).forEach((key) => {
      const { value, attrs } = hashValue[key];
      const keyBuff = this.encodeKey(key);
      totalSize += keyBuff.byteLength;
      buffers.push(keyBuff);
      buffers.push(encodeUInt32(this, value.type_));
      totalSize += 4;
      const attrCountIndex = buffers.push(encodeUInt32(this, 0));
      totalSize += 4;
      let attrsCount = 0;
      Object.keys(attrs).forEach((attrsKey) => {
        attrsCount += 1;
        const attrValue = attrs[attrsKey];
        const ak = this.encodeKey(key);
        const av = this.encodeValue(attrValue.value_);
        totalSize += ak.byteLength + 4 + av.byteLength;
        buffers.push(ak, encodeUInt32(this, attrValue.type_), av);
      });
      new DataView(buffers[attrCountIndex - 1]).setUint32(0, attrsCount, true);
      const valueBuff = this.encodeValue(value);
      buffers.push(valueBuff);
      totalSize += valueBuff.byteLength;
      keyCount += 1;
    });
    // set the key number
    new DataView(buffers[0]).setUint32(0, keyCount, true);
    const ret = new Uint8Array(totalSize);
    let pos = 0;
    buffers.forEach((element) => {
      ret.set(new Uint8Array(element), pos);
      pos += element.byteLength;
    });
    return ret;
  }
}

export default BinaryEncoder;
