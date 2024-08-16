/*
 * Value types supported by the Karabo Hash type.
 *
 * Created on September, 2021.
 *
 * Author: alessandro.silenzi@xfel.eu
 *
 * Copyright (C) European XFEL GmbH Hamburg. All rights reserved.
 */

/* eslint max-classes-per-file: ["error", 50] */

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
  ComplexFloat = 24,
  VectorComplexFloat = 25,
  ComplexDouble = 26,
  VectorComplexDouble = 27,
  String = 28,
  VectorString = 29,
  Hash = 30,
  VectorHash = 31,
  Schema = 32,
  None = 35,
  ByteArray = 37,
}

export interface KaraboType {
  type_: HashTypes;
  value_: any;
}

export interface Attributes {
  [key: string]: KaraboType;
}

export interface HashNode {
  value: KaraboType;
  attrs: Attributes;
}

export class HashValue {
  [key: string]: HashNode;
}

export class Hash {
  readonly type = HashTypes.Hash;

  constructor(public value: HashValue) {}
}

export class VectorHash {
  readonly type = HashTypes.VectorHash;

  constructor(public value: HashValue[]) {}
}

export interface SchemaValue {
  name: string;
  hash: HashValue;
}

export class Schema {
  readonly type_ = HashTypes.Schema;

  constructor(public value_: SchemaValue) {}
}

class Integer {
  readonly min: number = 0;

  readonly max: number = 0;

  protected value_: number;

  constructor(value: number) {
    this.value_ = Math.min(Math.max(value, this.min), this.max);
  }

  get value(): number {
    return this.value_;
  }
}

function makeInteger(type: HashTypes, min: number, max: number) {
  return class Int implements KaraboType {
    readonly type_ = HashTypes.UInt8;

    readonly _min = min;

    readonly _max = max;

    constructor(public value_: number) {
      this.value_ = Math.min(Math.max(value_, this._min), this._max);
    }
  };
}

export const AutoUInt8 = makeInteger(HashTypes.UInt8, 0, 2 ** 8 - 1);

export class UInt8 extends Integer {
  readonly type = HashTypes.UInt8;

  readonly min = 0;

  readonly max = 2 ** 8 - 1;

  constructor(public _value: number) {
    super(_value);
  }
}

export class VectorUInt8 implements KaraboType {
  readonly type_ = HashTypes.VectorUInt8;

  constructor(public value_: number[]) {}
}

export class Int8 extends Integer {
  readonly type_ = HashTypes.Int8;

  readonly min = -1 * 2 ** 7;

  readonly max = 2 ** 7 - 1;

  constructor(public value_: number) {
    super(value_);
  }
}

export class VectorInt8 implements KaraboType {
  readonly type_ = HashTypes.VectorInt8;

  constructor(public value_: number[]) {}
}

export class UInt16 extends Integer {
  readonly type_ = HashTypes.UInt16;

  readonly min = 0;

  readonly max = 2 ** 16 - 1;

  constructor(public value_: number) {
    super(value_);
  }
}

export class VectorUInt16 implements KaraboType {
  readonly type_ = HashTypes.VectorUInt16;

  constructor(public value_: number[]) {}
}

export class Int16 extends Integer {
  readonly type_ = HashTypes.Int16;

  readonly min = -1 * 2 ** 15;

  readonly max = 2 ** 15 - 1;

  constructor(public value_: number) {
    super(value_);
  }
}

export class VectorInt16 implements KaraboType {
  readonly type_ = HashTypes.VectorInt16;

  constructor(public value_: number[]) {}
}

export class UInt32 extends Integer {
  readonly type = HashTypes.UInt32;

  readonly min = 0;

  readonly max = 2 ** 32 - 1;

  constructor(public value_: number) {
    super(value_);
  }
}

export class VectorUInt32 implements KaraboType {
  readonly type_ = HashTypes.VectorUInt32;

  constructor(public value_: number[]) {}
}

export class Int32 extends Integer {
  readonly type_ = HashTypes.Int32;

  readonly min = -1 * 2 ** 31;

  readonly max = 2 ** 31 - 1;

  constructor(public value_: number) {
    super(value_);
  }
}

export class VectorInt32 implements KaraboType {
  readonly type_ = HashTypes.VectorInt32;

  constructor(public value_: number[]) {}
}

export class UInt64 {
  readonly type_ = HashTypes.UInt64;

  readonly min = 0;

  readonly max = 2 ** 64 - 1;

  protected value_: bigint;

  constructor(value: bigint) {
    this.value_ = BigInt.asUintN(64, value);
  }

  get value(): bigint {
    return this.value_;
  }
}

export class VectorUInt64 implements KaraboType {
  readonly type_ = HashTypes.VectorInt64;

  constructor(public value_: number[]) {}
}

export class Int64 {
  readonly type_ = HashTypes.Int64;

  readonly min = -1 * 2 ** 63;

  readonly max = 2 ** 63 - 1;

  protected value_: bigint;

  constructor(value: bigint) {
    this.value_ = BigInt.asIntN(64, value);
  }

  get value(): bigint {
    return this.value_;
  }
}

export class VectorInt64 implements KaraboType {
  readonly type_ = HashTypes.VectorInt64;

  constructor(public value_: number[]) {}
}

export class Float32 implements KaraboType {
  readonly type_ = HashTypes.Float32;

  constructor(public value_: number) {}

  get value(): number {
    return this.value_;
  }
}

export class VectorFloat32 implements KaraboType {
  readonly type_ = HashTypes.VectorFloat32;

  constructor(public value_: number[]) {}
}

export class Float64 implements KaraboType {
  readonly type_ = HashTypes.Float32;

  constructor(public value_: number) {}

  get value(): number {
    return this.value_;
  }
}

export class VectorFloat64 implements KaraboType {
  readonly type_ = HashTypes.VectorFloat64;

  constructor(public value_: number[]) {}
}

export class Bool implements KaraboType {
  readonly type_ = HashTypes.Bool;

  constructor(public value_: boolean) {}
}

export class VectorBool implements KaraboType {
  readonly type_ = HashTypes.VectorBool;

  constructor(public value_: boolean[]) {}
}

export class String implements KaraboType {
  readonly type_ = HashTypes.String;

  constructor(public value_: string) {}
}

export class VectorString implements KaraboType {
  readonly type_ = HashTypes.VectorString;

  constructor(public value_: string[]) {}
}

export function toString(karabo_value: any): string {
  return JSON.stringify(karabo_value, (key, value_) =>
    typeof value_ === "bigint" ? value_.toString() + "n" : value_
  );
}
