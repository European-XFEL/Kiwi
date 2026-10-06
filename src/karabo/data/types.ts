import { HashType, getHashTypeFromValue } from './typenums';
import {
  Integer,
  BigInteger,
  FloatingPoint,
  StringLike,
  BooleanLike,
} from './basetypes';

export type SimpleValueTypes = number | string | bigint | boolean;

export type NumericVectorTypes =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | BigInt64Array
  | BigUint64Array
  | Float32Array
  | Float64Array;

export function isTypedArray(
  value: unknown
): value is NumericVectorTypes | Uint8ClampedArray {
  return ArrayBuffer.isView(value) && !(value instanceof DataView);
}

export type ValueTypes =
  SimpleValueTypes | SimpleValueTypes[] | NumericVectorTypes;

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

export class VectorUInt8Value extends Uint8Array implements KaraboValue {
  readonly type_ = HashType.VectorUInt8;

  get value_(): VectorUInt8Value {
    return this;
  }
}

export class Int8Value extends Integer implements KaraboValue {
  readonly type_ = HashType.Int8;
  static readonly MIN = -1 * 2 ** 7;
  static readonly MAX = 2 ** 7 - 1;

  constructor(value: number) {
    super(value);
  }
}

export class VectorInt8Value extends Int8Array implements KaraboValue {
  readonly type_ = HashType.VectorInt8;

  get value_(): VectorInt8Value {
    return this;
  }
}

export class UInt16Value extends Integer implements KaraboValue {
  readonly type_ = HashType.UInt16;
  static readonly MIN = 0;
  static readonly MAX = 2 ** 16 - 1;

  constructor(value: number) {
    super(value);
  }
}

export class VectorUInt16Value extends Uint16Array implements KaraboValue {
  readonly type_ = HashType.VectorUInt16;

  get value_(): VectorUInt16Value {
    return this;
  }
}

export class Int16Value extends Integer implements KaraboValue {
  readonly type_ = HashType.Int16;
  static readonly MIN = -1 * 2 ** 15;
  static readonly MAX = 2 ** 15 - 1;

  constructor(value: number) {
    super(value);
  }
}

export class VectorInt16Value extends Int16Array implements KaraboValue {
  readonly type_ = HashType.VectorInt16;

  get value_(): VectorInt16Value {
    return this;
  }
}

export class UInt32Value extends Integer implements KaraboValue {
  readonly type_ = HashType.UInt32;
  static readonly MIN = 0;
  static readonly MAX = 2 ** 32 - 1;

  constructor(value: number) {
    super(value);
  }
}

export class VectorUInt32Value extends Uint32Array implements KaraboValue {
  readonly type_ = HashType.VectorUInt32;

  get value_(): VectorUInt32Value {
    return this;
  }
}

export class Int32Value extends Integer implements KaraboValue {
  readonly type_ = HashType.Int32;
  static readonly MIN = -1 * 2 ** 31;
  static readonly MAX = 2 ** 31 - 1;

  constructor(value: number) {
    super(value);
  }
}

export class VectorInt32Value extends Int32Array implements KaraboValue {
  readonly type_ = HashType.VectorInt32;

  get value_(): VectorInt32Value {
    return this;
  }
}

export class UInt64Value extends BigInteger implements KaraboValue {
  readonly type_ = HashType.UInt64;
  static readonly MIN = 0n;
  static readonly MAX = 2n ** 64n - 1n;

  constructor(value: bigint) {
    super(BigInt.asUintN(64, value));
  }
}

export class VectorUInt64Value extends BigUint64Array implements KaraboValue {
  readonly type_ = HashType.VectorUInt64;

  get value_(): VectorUInt64Value {
    return this;
  }
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

export class VectorInt64Value extends BigInt64Array implements KaraboValue {
  readonly type_ = HashType.VectorInt64;

  get value_(): VectorInt64Value {
    return this;
  }
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

export class VectorFloatValue extends Float32Array implements KaraboValue {
  readonly type_ = HashType.VectorFloat;

  get value_(): VectorFloatValue {
    return this;
  }
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

export class VectorDoubleValue extends Float64Array implements KaraboValue {
  readonly type_ = HashType.VectorDouble;

  get value_(): VectorDoubleValue {
    return this;
  }
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

export class VectorCharValue implements KaraboValue {
  readonly type_ = HashType.VectorChar;
  // Must be string
  constructor(public value_: Uint8Array) {}
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

export function wrapValue(value: ValueTypes, type_: HashType): KaraboValue {
  const C = getValuefromHashType(type_);
  if (!C) {
    throw new Error(`Unsupported Karabo type: ${HashType[type_] ?? type_}`);
  }
  return new C(value as any);
}

function isKaraboValue(value: unknown): value is KaraboValue {
  return (
    value !== null &&
    typeof value === 'object' &&
    Object.prototype.hasOwnProperty.call(value, 'type_') &&
    'value_' in value
  );
}

export function unwrap(data: unknown): KaraboValue['value_'] {
  return isKaraboValue(data) ? data.value_ : data;
}

type VectorCtor = {
  new (buffer: ArrayBuffer, byteOffset: number, length: number): KaraboValue;
};

const TYPED_ARRAY_VIEWS = new Map<object, VectorCtor>([
  [Int8Array, VectorInt8Value],
  [Int16Array, VectorInt16Value],
  [Uint16Array, VectorUInt16Value],
  [Int32Array, VectorInt32Value],
  [Uint32Array, VectorUInt32Value],
  [BigInt64Array, VectorInt64Value],
  [BigUint64Array, VectorUInt64Value],
  [Float32Array, VectorFloatValue],
  [Float64Array, VectorDoubleValue],
]);

export function wrap(value: unknown): KaraboValue {
  if (isKaraboValue(value)) {
    return value;
  }
  if (isTypedArray(value)) {
    if (value instanceof Uint8Array) {
      return new VectorCharValue(value);
    }
    const Vector = TYPED_ARRAY_VIEWS.get(value.constructor);
    if (!Vector) {
      throw new Error('Unsupported Karabo typed array');
    }
    return new Vector(
      value.buffer as ArrayBuffer,
      value.byteOffset,
      value.length
    );
  }
  return wrapValue(value as ValueTypes, getHashTypeFromValue(value));
}
