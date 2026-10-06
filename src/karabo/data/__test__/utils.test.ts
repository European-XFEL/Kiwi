import { HashType } from '../typenums';
import { isHashTypes, isTypedArray } from '../utils';

describe('isHashTypes', () => {
  test.each([HashType.Hash, HashType.Schema, HashType.VectorHash])(
    'recognizes structured type %s',
    (dtype) => {
      expect(isHashTypes(dtype)).toBe(true);
    }
  );

  test.each([HashType.String, HashType.Int32, HashType.VectorString])(
    'rejects primitive type %s',
    (dtype) => {
      expect(isHashTypes(dtype)).toBe(false);
    }
  );
});

describe('isTypedArray', () => {
  test('recognizes numeric typed arrays', () => {
    expect(isTypedArray(new Int32Array())).toBe(true);
    expect(isTypedArray(new Uint8ClampedArray())).toBe(true);
    expect(isTypedArray(new Float64Array())).toBe(true);
    expect(isTypedArray(new BigInt64Array())).toBe(true);
  });

  test('rejects arrays and DataView', () => {
    expect(isTypedArray([])).toBe(false);
    expect(isTypedArray(new DataView(new ArrayBuffer(0)))).toBe(false);
  });
});
