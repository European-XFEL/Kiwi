import { HashTypes } from './typenums';

export type SimpleValueTypes = number | string | bigint | boolean;

export type ValueTypes = SimpleValueTypes | SimpleValueTypes[] | Uint8Array;

export interface KaraboValue {
  type_: HashTypes;
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
  readonly type_ = HashTypes.UInt8;
  readonly min = 0;
  readonly max = 2 ** 8 - 1;

  constructor(public value_: number) {
    super(value_);
  }
}

export class VectorUInt8Value implements KaraboValue {
  readonly type_ = HashTypes.VectorUInt8;

  constructor(public value_: number[]) {}
}

export class Int8Value extends Integer implements KaraboValue {
  readonly type_ = HashTypes.Int8;
  readonly min = -1 * 2 ** 7;
  readonly max = 2 ** 7 - 1;

  constructor(public value_: number) {
    super(value_);
  }
}

export class VectorInt8Value implements KaraboValue {
  readonly type_ = HashTypes.VectorInt8;

  constructor(public value_: number[]) {}
}

export class UInt16Value extends Integer implements KaraboValue {
  readonly type_ = HashTypes.UInt16;
  readonly min = 0;
  readonly max = 2 ** 16 - 1;

  constructor(public value_: number) {
    super(value_);
  }
}

export class VectorUInt16Value implements KaraboValue {
  readonly type_ = HashTypes.VectorUInt16;

  constructor(public value_: number[]) {}
}

export class Int16Value extends Integer implements KaraboValue {
  readonly type_ = HashTypes.Int16;
  readonly min = -1 * 2 ** 15;
  readonly max = 2 ** 15 - 1;

  constructor(public value_: number) {
    super(value_);
  }
}

export class VectorInt16Value implements KaraboValue {
  readonly type_ = HashTypes.VectorInt16;

  constructor(public value_: number[]) {}
}

export class UInt32Value extends Integer implements KaraboValue {
  readonly type_ = HashTypes.UInt32;

  readonly min = 0;
  readonly max = 2 ** 32 - 1;

  constructor(public value_: number) {
    super(value_);
  }
}

export class VectorUInt32Value implements KaraboValue {
  readonly type_ = HashTypes.VectorUInt32;

  constructor(public value_: number[]) {}
}

export class Int32Value extends Integer implements KaraboValue {
  readonly type_ = HashTypes.Int32;
  readonly min = -1 * 2 ** 31;
  readonly max = 2 ** 31 - 1;

  constructor(public value_: number) {
    super(value_);
  }
}

export class VectorInt32Value implements KaraboValue {
  readonly type_ = HashTypes.VectorInt32;

  constructor(public value_: number[]) {}
}

export class UInt64Value implements KaraboValue {
  readonly type_ = HashTypes.UInt64;
  readonly min = 0;
  readonly max = 2 ** 64 - 1;
  public value_: bigint;

  constructor(value: bigint) {
    this.value_ = BigInt.asUintN(64, value);
  }
}

export class VectorUInt64Value implements KaraboValue {
  readonly type_ = HashTypes.VectorUInt64;
  constructor(public value_: bigint[]) {}
}

export class Int64Value implements KaraboValue {
  readonly type_ = HashTypes.Int64;
  readonly min = -1 * 2 ** 63;
  readonly max = 2 ** 63 - 1;

  public value_: bigint;

  constructor(value: bigint) {
    this.value_ = BigInt.asIntN(64, value);
  }
}

export class VectorInt64Value implements KaraboValue {
  readonly type_ = HashTypes.VectorInt64;

  constructor(public value_: bigint[]) {}
}

export class Float32Value implements KaraboValue {
  readonly type_ = HashTypes.Float32;

  constructor(public value_: number) {}
}

export class VectorFloat32Value implements KaraboValue {
  readonly type_ = HashTypes.VectorFloat32;

  constructor(public value_: number[]) {}
}

export class Float64Value implements KaraboValue {
  readonly type_ = HashTypes.Float64;

  constructor(public value_: number) {}
}

export class VectorFloat64Value implements KaraboValue {
  readonly type_ = HashTypes.VectorFloat64;

  constructor(public value_: number[]) {}
}

export class BoolValue implements KaraboValue {
  readonly type_ = HashTypes.Bool;

  constructor(public value_: boolean) {}
}

export class VectorBoolValue implements KaraboValue {
  readonly type_ = HashTypes.VectorBool;

  constructor(public value_: boolean[]) {}
}

export class StringValue implements KaraboValue {
  readonly type_ = HashTypes.String;

  constructor(public value_: string) {}
}

export class VectorStringValue implements KaraboValue {
  readonly type_ = HashTypes.VectorString;

  constructor(public value_: string[]) {}
}

export class VectorCharValue implements KaraboValue {
  readonly type_ = HashTypes.VectorChar;

  constructor(public value_: Uint8Array) {}
}

export class CharValue implements KaraboValue {
  // this is a terrible type and barely used.
  // essentially a UInt8
  readonly type_ = HashTypes.Char;

  constructor(public value_: number) {}
}

// Constructor type: "new (value) => instance"
type Ctor<T> = new (value: any) => T;

const TYPE_TO_CLASS: Partial<Record<HashTypes, Ctor<KaraboValue>>> = {
  [HashTypes.UInt8]: UInt8Value,
  [HashTypes.VectorUInt8]: VectorUInt8Value,

  [HashTypes.Int8]: Int8Value,
  [HashTypes.VectorInt8]: VectorInt8Value,

  [HashTypes.UInt16]: UInt16Value,
  [HashTypes.VectorUInt16]: VectorUInt16Value,

  [HashTypes.Int16]: Int16Value,
  [HashTypes.VectorInt16]: VectorInt16Value,

  [HashTypes.UInt32]: UInt32Value,
  [HashTypes.VectorUInt32]: VectorUInt32Value,

  [HashTypes.Int32]: Int32Value,
  [HashTypes.VectorInt32]: VectorInt32Value,

  [HashTypes.UInt64]: UInt64Value,
  [HashTypes.VectorUInt64]: VectorUInt64Value,

  [HashTypes.Int64]: Int64Value,
  [HashTypes.VectorInt64]: VectorInt64Value,

  [HashTypes.Float32]: Float32Value,
  [HashTypes.VectorFloat32]: VectorFloat32Value,

  [HashTypes.Float64]: Float64Value,
  [HashTypes.VectorFloat64]: VectorFloat64Value,

  [HashTypes.Bool]: BoolValue,
  [HashTypes.VectorBool]: VectorBoolValue,

  [HashTypes.String]: StringValue,
  [HashTypes.VectorString]: VectorStringValue,

  [HashTypes.Char]: CharValue,
  [HashTypes.VectorChar]: VectorCharValue,
};

function getValuefromHashType(type_: HashTypes): Ctor<KaraboValue> | null {
  return TYPE_TO_CLASS[type_] ?? null;
}

export function castKaraboValue(
  type_: HashTypes,
  value: ValueTypes
): KaraboValue {
  const C = getValuefromHashType(type_);
  if (!C) {
    throw new Error(`Unsupported Karabo type: ${HashTypes[type_] ?? type_}`);
  }
  return new C(value as any);
}
