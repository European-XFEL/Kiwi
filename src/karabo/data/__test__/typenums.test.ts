import { Hash } from '@/karabo/data/hash';
import { HashType, getHashTypeFromValue } from '@/karabo/data/typenums';

describe('getHashTypeFromValue', () => {
  test('infers primitive types', () => {
    expect(getHashTypeFromValue('abc')).toBe(HashType.String);
    expect(getHashTypeFromValue(true)).toBe(HashType.Bool);
    expect(getHashTypeFromValue(42n)).toBe(HashType.Int64);
    expect(getHashTypeFromValue(42)).toBe(HashType.Int32);
    expect(getHashTypeFromValue(42.5)).toBe(HashType.Double);
  });

  test('infers Uint8Array as VectorChar', () => {
    expect(getHashTypeFromValue(new Uint8Array([1, 2, 3]))).toBe(
      HashType.VectorChar
    );
  });

  test('infers array types from first element', () => {
    expect(getHashTypeFromValue([])).toBe(HashType.VectorString);
    expect(getHashTypeFromValue(['a'])).toBe(HashType.VectorString);
    expect(getHashTypeFromValue([1])).toBe(HashType.VectorInt32);
    expect(getHashTypeFromValue([1.5])).toBe(HashType.VectorDouble);
    expect(getHashTypeFromValue([true])).toBe(HashType.VectorBool);
    expect(getHashTypeFromValue([1n])).toBe(HashType.VectorInt64);
  });

  test('uses own type_ when present', () => {
    const wrapped = { type_: HashType.UInt16, value_: 12 };
    expect(getHashTypeFromValue(wrapped)).toBe(HashType.UInt16);

    const hash = new Hash();
    expect(getHashTypeFromValue(hash)).toBe(HashType.Hash);
  });

  test('does not use inherited type_', () => {
    const proto = { type_: HashType.UInt16 };
    const inheritedOnly = Object.create(proto) as Record<string, unknown>;

    expect(() => getHashTypeFromValue(inheritedOnly)).toThrow(
      /Cannot infer HashType/
    );
  });

  test('throws for unsupported values', () => {
    expect(() => getHashTypeFromValue(undefined)).toThrow(
      /Cannot infer HashType/
    );
    expect(() => getHashTypeFromValue(null)).toThrow();
    expect(() => getHashTypeFromValue(Symbol('x'))).toThrow(
      /Cannot infer HashType/
    );
  });
});
