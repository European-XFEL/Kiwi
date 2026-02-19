import { HashType } from './typenums';

export type SimpleValueTypes = number | string | bigint | boolean;

export type ValueTypes = SimpleValueTypes | SimpleValueTypes[] | Uint8Array;

export interface KaraboValue {
  type_: HashType;
  value_: any;
}

class Integer {
  readonly min: number = 0;
  readonly max: number = 0;
  protected value_: number;

  constructor(value: number) {
    this.value_ = Math.min(Math.max(value, this.min), this.max);
  }
}

export class UInt8Value extends Integer implements KaraboValue {
  readonly type_ = HashType.UInt8;
  readonly min = 0;
  readonly max = 2 ** 8 - 1;

  constructor(public value_: number) {
    super(value_);
  }
}

export class VectorUInt8Value implements KaraboValue {
  readonly type_ = HashType.VectorUInt8;

  constructor(public value_: number[]) {}
}

export class Int8Value extends Integer implements KaraboValue {
  readonly type_ = HashType.Int8;
  readonly min = -1 * 2 ** 7;
  readonly max = 2 ** 7 - 1;

  constructor(public value_: number) {
    super(value_);
  }
}

export class VectorInt8Value implements KaraboValue {
  readonly type_ = HashType.VectorInt8;

  constructor(public value_: number[]) {}
}

export class UInt16Value extends Integer implements KaraboValue {
  readonly type_ = HashType.UInt16;
  readonly min = 0;
  readonly max = 2 ** 16 - 1;

  constructor(public value_: number) {
    super(value_);
  }
}

export class VectorUInt16Value implements KaraboValue {
  readonly type_ = HashType.VectorUInt16;

  constructor(public value_: number[]) {}
}

export class Int16Value extends Integer implements KaraboValue {
  readonly type_ = HashType.Int16;
  readonly min = -1 * 2 ** 15;
  readonly max = 2 ** 15 - 1;

  constructor(public value_: number) {
    super(value_);
  }
}

export class VectorInt16Value implements KaraboValue {
  readonly type_ = HashType.VectorInt16;

  constructor(public value_: number[]) {}
}

export class UInt32Value extends Integer implements KaraboValue {
  readonly type_ = HashType.UInt32;

  readonly min = 0;
  readonly max = 2 ** 32 - 1;

  constructor(public value_: number) {
    super(value_);
  }
}

export class VectorUInt32Value implements KaraboValue {
  readonly type_ = HashType.VectorUInt32;

  constructor(public value_: number[]) {}
}

export class Int32Value extends Integer implements KaraboValue {
  readonly type_ = HashType.Int32;
  readonly min = -1 * 2 ** 31;
  readonly max = 2 ** 31 - 1;

  constructor(public value_: number) {
    super(value_);
  }
}

export class VectorInt32Value implements KaraboValue {
  readonly type_ = HashType.VectorInt32;

  constructor(public value_: number[]) {}
}

export class UInt64Value implements KaraboValue {
  readonly type_ = HashType.UInt64;
  readonly min = 0;
  readonly max = 2 ** 64 - 1;
  public value_: bigint;

  constructor(value: bigint) {
    this.value_ = BigInt.asUintN(64, value);
  }
}

export class VectorUInt64Value implements KaraboValue {
  readonly type_ = HashType.VectorUInt64;
  constructor(public value_: bigint[]) {}
}

export class Int64Value implements KaraboValue {
  readonly type_ = HashType.Int64;
  readonly min = -1 * 2 ** 63;
  readonly max = 2 ** 63 - 1;

  public value_: bigint;

  constructor(value: bigint) {
    this.value_ = BigInt.asIntN(64, value);
  }
}

export class VectorInt64Value implements KaraboValue {
  readonly type_ = HashType.VectorInt64;

  constructor(public value_: bigint[]) {}
}

export class FloatValue implements KaraboValue {
  readonly type_ = HashType.Float;

  constructor(public value_: number) {}
}

export class VectorFloatValue implements KaraboValue {
  readonly type_ = HashType.VectorFloat;

  constructor(public value_: number[]) {}
}

export class DoubleValue implements KaraboValue {
  readonly type_ = HashType.Double;

  constructor(public value_: number) {}
}

export class VectorDoubleValue implements KaraboValue {
  readonly type_ = HashType.VectorDouble;

  constructor(public value_: number[]) {}
}

export class BoolValue implements KaraboValue {
  readonly type_ = HashType.Bool;

  constructor(public value_: boolean) {}
}

export class VectorBoolValue implements KaraboValue {
  readonly type_ = HashType.VectorBool;

  constructor(public value_: boolean[]) {}
}

export class StringValue implements KaraboValue {
  readonly type_ = HashType.String;

  constructor(public value_: string) {}
}

export class VectorStringValue implements KaraboValue {
  readonly type_ = HashType.VectorString;

  constructor(public value_: string[]) {}
}

export class VectorCharValue implements KaraboValue {
  readonly type_ = HashType.VectorChar;

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
