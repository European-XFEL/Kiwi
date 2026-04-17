import { HashType } from './typenums';
import {
  Integer,
  BigInteger,
  FloatingPoint,
  StringLike,
  BooleanLike,
} from './basetypes';

export type SimpleValueTypes = number | string | bigint | boolean;

export type ValueTypes = SimpleValueTypes | SimpleValueTypes[] | Uint8Array;

export interface KaraboValue {
  type_: HashType;
  value_: any;
}

export class UInt8Value extends Integer implements KaraboValue {
  readonly type_ = HashType.UInt8;
  static readonly MIN = 0;
  static readonly MAX = 2 ** 8 - 1;

  constructor(value: number) {
    super(value);
  }
}

export class VectorUInt8Value implements KaraboValue {
  readonly type_ = HashType.VectorUInt8;

  constructor(public value_: number[]) {}
}

export class Int8Value extends Integer implements KaraboValue {
  readonly type_ = HashType.Int8;
  static readonly MIN = -1 * 2 ** 7;
  static readonly MAX = 2 ** 7 - 1;

  constructor(value: number) {
    super(value);
  }
}

export class VectorInt8Value implements KaraboValue {
  readonly type_ = HashType.VectorInt8;

  constructor(public value_: number[]) {}
}

export class UInt16Value extends Integer implements KaraboValue {
  readonly type_ = HashType.UInt16;
  static readonly MIN = 0;
  static readonly MAX = 2 ** 16 - 1;

  constructor(value: number) {
    super(value);
  }
}

export class VectorUInt16Value implements KaraboValue {
  readonly type_ = HashType.VectorUInt16;

  constructor(public value_: number[]) {}
}

export class Int16Value extends Integer implements KaraboValue {
  readonly type_ = HashType.Int16;
  static readonly MIN = -1 * 2 ** 15;
  static readonly MAX = 2 ** 15 - 1;

  constructor(value: number) {
    super(value);
  }
}

export class VectorInt16Value implements KaraboValue {
  readonly type_ = HashType.VectorInt16;

  constructor(public value_: number[]) {}
}

export class UInt32Value extends Integer implements KaraboValue {
  readonly type_ = HashType.UInt32;
  static readonly MIN = 0;
  static readonly MAX = 2 ** 32 - 1;

  constructor(value: number) {
    super(value);
  }
}

export class VectorUInt32Value implements KaraboValue {
  readonly type_ = HashType.VectorUInt32;

  constructor(public value_: number[]) {}
}

export class Int32Value extends Integer implements KaraboValue {
  readonly type_ = HashType.Int32;
  static readonly MIN = -1 * 2 ** 31;
  static readonly MAX = 2 ** 31 - 1;

  constructor(value: number) {
    super(value);
  }
}

export class VectorInt32Value implements KaraboValue {
  readonly type_ = HashType.VectorInt32;

  constructor(public value_: number[]) {}
}

export class UInt64Value extends BigInteger implements KaraboValue {
  readonly type_ = HashType.UInt64;
  static readonly MIN = 0n;
  static readonly MAX = 2n ** 64n - 1n;

  constructor(value: bigint) {
    super(BigInt.asUintN(64, value));
  }
}

export class VectorUInt64Value implements KaraboValue {
  readonly type_ = HashType.VectorUInt64;
  constructor(public value_: bigint[]) {}
}

export class Int64Value extends BigInteger implements KaraboValue {
  readonly type_ = HashType.Int64;

  // XXX: 'n' for BigInt literals
  static readonly MIN = -(2n ** 63n);
  static readonly MAX = 2n ** 63n - 1n;

  constructor(value: bigint) {
    super(BigInt.asIntN(64, value));
  }
}

export class VectorInt64Value implements KaraboValue {
  readonly type_ = HashType.VectorInt64;

  constructor(public value_: bigint[]) {}
}

export class FloatValue extends FloatingPoint implements KaraboValue {
  readonly type_ = HashType.Float;

  // IEEE 754 single-precision (32-bit) boundaries
  static readonly MIN = -3.402823466e38;
  static readonly MAX = 3.402823466e38;

  constructor(value: number) {
    // Math.fround safely rounds a 64-bit to 32-bit precision
    super(Math.fround(value));
  }
}

export class VectorFloatValue implements KaraboValue {
  readonly type_ = HashType.VectorFloat;

  constructor(public value_: number[]) {}
}

export class DoubleValue extends FloatingPoint implements KaraboValue {
  readonly type_ = HashType.Double;
  // IEEE 754 double-precision (64-bit) boundaries
  static readonly MIN = -Number.MAX_VALUE;
  static readonly MAX = Number.MAX_VALUE;

  constructor(value: number) {
    // Standard JS precision is already 64-bit double
    super(value);
  }
}

export class VectorDoubleValue implements KaraboValue {
  readonly type_ = HashType.VectorDouble;

  constructor(public value_: number[]) {}
}

export class BoolValue extends BooleanLike implements KaraboValue {
  readonly type_ = HashType.Bool;
}

export class VectorBoolValue implements KaraboValue {
  readonly type_ = HashType.VectorBool;

  constructor(public value_: boolean[]) {}
}

export class StringValue extends StringLike implements KaraboValue {
  readonly type_ = HashType.String;
}

export class VectorStringValue implements KaraboValue {
  readonly type_ = HashType.VectorString;

  constructor(public value_: string[]) {}
}

export class VectorCharValue extends StringLike implements KaraboValue {
  readonly type_ = HashType.VectorChar;
}

export class CharValue implements KaraboValue {
  // this is a terrible type and barely used.
  // essentially a UInt8
  readonly type_ = HashType.Char;

  constructor(public value_: number) {}
}

// Constructor type: "new (value) => instance"
type Ctor<T> = new (value: any) => T;

const TYPE_TO_CLASS: Partial<Record<HashType, Ctor<KaraboValue>>> = {
  [HashType.UInt8]: UInt8Value,
  [HashType.VectorUInt8]: VectorUInt8Value,

  [HashType.Int8]: Int8Value,
  [HashType.VectorInt8]: VectorInt8Value,

  [HashType.UInt16]: UInt16Value,
  [HashType.VectorUInt16]: VectorUInt16Value,

  [HashType.Int16]: Int16Value,
  [HashType.VectorInt16]: VectorInt16Value,

  [HashType.UInt32]: UInt32Value,
  [HashType.VectorUInt32]: VectorUInt32Value,

  [HashType.Int32]: Int32Value,
  [HashType.VectorInt32]: VectorInt32Value,

  [HashType.UInt64]: UInt64Value,
  [HashType.VectorUInt64]: VectorUInt64Value,

  [HashType.Int64]: Int64Value,
  [HashType.VectorInt64]: VectorInt64Value,

  [HashType.Float]: FloatValue,
  [HashType.VectorFloat]: VectorFloatValue,

  [HashType.Double]: DoubleValue,
  [HashType.VectorDouble]: VectorDoubleValue,

  [HashType.Bool]: BoolValue,
  [HashType.VectorBool]: VectorBoolValue,

  [HashType.String]: StringValue,
  [HashType.VectorString]: VectorStringValue,

  [HashType.Char]: CharValue,
  [HashType.VectorChar]: VectorCharValue,
};

function getValuefromHashType(type_: HashType): Ctor<KaraboValue> | null {
  return TYPE_TO_CLASS[type_] ?? null;
}

export function castKaraboValue(
  type_: HashType,
  value: ValueTypes
): KaraboValue {
  const C = getValuefromHashType(type_);
  if (!C) {
    throw new Error(`Unsupported Karabo type: ${HashType[type_] ?? type_}`);
  }
  return new C(value as any);
}
