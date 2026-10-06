import { HashType } from '../typenums';
import { VectorInt32Value, wrap, wrapValue } from '../types';
import {
  Integer,
  BigInteger,
  FloatingPoint,
  StringLike,
  BooleanLike,
} from '../basetypes';

describe('Base Class Value Objects', () => {
  class Int8 extends Integer {
    static MIN = -128;
    static MAX = 127;
  }

  describe('Integer (Int8)', () => {
    test('casts valid numbers and strings', () => {
      expect(Int8.cast(10).value).toBe(10);
      expect(Int8.cast('42').value).toBe(42);
    });

    test('unwraps object values', () => {
      expect(Int8.cast({ value: 5 }).value).toBe(5);
    });

    test('throws on non-integers or bounds', () => {
      expect(() => Int8.cast(10.5)).toThrow('Value must be an integer');
      expect(() => Int8.cast(200)).toThrow('Value out of bounds');
      expect(() => Int8.cast('abc')).toThrow('Value must be a valid number');
    });
  });

  class Int64 extends BigInteger {
    static MIN = BigInt('-9223372036854775808');
    static MAX = BigInt('9223372036854775807');
  }

  describe('BigInteger (Int64)', () => {
    test('casts large integers', () => {
      const large = BigInt('9000000000000000000');
      expect(Int64.cast(large).value).toBe(large);
      expect(Int64.cast('12345').value).toBe(12345n);
    });

    test('throws on invalid BigInt strings', () => {
      expect(() => Int64.cast('10.5')).toThrow(
        'Value must be a valid 64-bit integer'
      );
    });
  });

  class Float32 extends FloatingPoint {
    static MIN = -3.4e38;
    static MAX = 3.4e38;
  }

  describe('FloatingPoint (Float32)', () => {
    test('casts decimals', () => {
      expect(Float32.cast(10.5).value).toBe(10.5);
      expect(Float32.cast('3.14').value).toBe(3.14);
    });

    test('handles NaN specifically', () => {
      const val = Float32.cast('NaN');
      expect(val.value).toBeNaN();
    });

    test('throws on out of bounds', () => {
      expect(() => Float32.cast(4e38)).toThrow('Value out of bounds');
    });
  });

  class MyString extends StringLike {}

  describe('StringLike', () => {
    test('converts primitives to strings', () => {
      expect(MyString.cast(123).value).toBe('123');
      expect(MyString.cast(true).value).toBe('true');
    });

    test('throws on null/undefined', () => {
      expect(() => MyString.cast(null)).toThrow(
        'Value cannot be null or undefined'
      );
    });
  });

  class MyBool extends BooleanLike {}

  describe('BooleanLike', () => {
    test('follows bool(int(value)) logic', () => {
      expect(MyBool.cast(1).value).toBe(true);
      expect(MyBool.cast(0).value).toBe(false);
      expect(MyBool.cast(-5).value).toBe(true);

      expect(MyBool.cast('1').value).toBe(true);
      expect(MyBool.cast('0').value).toBe(false);
      expect(MyBool.cast('').value).toBe(false); // Number("") is 0

      expect(MyBool.cast(true).value).toBe(true);
      expect(MyBool.cast(null).value).toBe(false); // Number(null) is 0
    });

    test('unwraps nested boolean objects', () => {
      const existing = MyBool.cast(1);
      expect(MyBool.cast(existing).value).toBe(true);
    });
  });

  test('wrapValue retains copying semantics', () => {
    const array = new Int32Array([1, 2]);
    const wrapped = wrapValue(array, HashType.VectorInt32) as VectorInt32Value;
    expect(wrapped.buffer).not.toBe(array.buffer);
    array[0] = 9;
    expect(wrapped[0]).toBe(1);
  });

  test('wrap preserves the buffer and offset of plain typed-array views', () => {
    const array = new Int32Array([0, 1, 2]);
    const subview = array.subarray(1);
    const wrapped = wrap(subview) as VectorInt32Value;
    expect(wrapped).toBeInstanceOf(VectorInt32Value);
    expect(wrapped.buffer).toBe(array.buffer);
    expect(wrapped.byteOffset).toBe(subview.byteOffset);
    expect(Array.from(wrapped)).toEqual([1, 2]);
    array[1] = 9;
    expect(wrapped[0]).toBe(9);
    expect(wrap(wrapped)).toBe(wrapped);
  });

  test('wrap rejects unsupported clamped arrays', () => {
    expect(() => wrap(new Uint8ClampedArray([1, 2]))).toThrow(/Unsupported/);
  });
});
