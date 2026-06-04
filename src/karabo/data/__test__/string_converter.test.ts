import { Hash, HashList } from '@/karabo/data/hash';
import { HashType } from '@/karabo/data/typenums';
import {
  hashTypeFromString,
  stringFromHashType,
} from '@/karabo/data/string_converter';
import { unwrap } from '@/karabo/data/utils';

describe('string_converter parity tests', () => {
  test('string roundtrip', () => {
    const d = 'string';
    const hashD = hashTypeFromString(HashType.String, d);

    expect((hashD as { type_: HashType }).type_).toBe(HashType.String);
    expect(unwrap(hashD)).toBe('string');
    expect(stringFromHashType(hashD, HashType.String)).toBe(d);
  });

  test('integers roundtrip', () => {
    const cases: Array<[HashType, string, number | bigint]> = [
      [HashType.Int8, '7', 7],
      [HashType.Int16, '15', 15],
      [HashType.Int32, '31', 31],
      [HashType.Int64, '63', 63n],
      [HashType.UInt8, '8', 8],
      [HashType.UInt16, '16', 16],
      [HashType.UInt32, '32', 32],
      [HashType.UInt64, '64', 64n],
    ];

    for (const [hashType, value, expected] of cases) {
      const hashD = hashTypeFromString(hashType, value);
      expect((hashD as { type_: HashType }).type_).toBe(hashType);
      expect(unwrap(hashD)).toBe(expected);
      expect(stringFromHashType(hashD, hashType)).toBe(value);
    }
  });

  test('floats roundtrip', () => {
    const cases: Array<[HashType, string, string[]]> = [
      [HashType.Float, '1231231', ['1.231231e+6', '1231231', '1231231.0']],

      [
        HashType.Float,
        '76233.233',
        ['76233.233', '76233.234', '76233.2', '76233.234375'],
      ],
      [HashType.Double, '1231231', ['1.231231e+6', '1231231', '1231231.0']],
      [HashType.Double, '76233.233', ['76233.233', '76233.234', '76233.2']],
    ];

    for (const [hashType, value, accepted] of cases) {
      const hashD = hashTypeFromString(hashType, value);
      expect((hashD as { type_: HashType }).type_).toBe(hashType);
      expect(typeof unwrap(hashD)).toBe('number');

      const stringD = stringFromHashType(hashD, hashType);
      expect(accepted).toContain(stringD);

      const precision = hashType === HashType.Float ? 2 : 3;
      expect(Number(stringD)).toBeCloseTo(Number(value), precision);
    }
  });

  test('none conversion', () => {
    const d = 'None';
    const hashD = hashTypeFromString(HashType.None_, d);

    expect(hashD).toBeNull();
    expect(stringFromHashType(hashD, HashType.None_)).toBe('None');
  });

  test('hash conversion', () => {
    const d = '{"marty":"mcfly","thunder":"lightning","cars":3}';
    const hashD = hashTypeFromString(HashType.Hash, d);

    expect(hashD).toBeInstanceOf(Hash);
    expect((hashD as Hash).getValue('marty')).toBe('mcfly');
    expect((hashD as Hash).getValue('thunder')).toBe('lightning');
    expect((hashD as Hash).getValue('cars')).toBe(3);

    const stringD = stringFromHashType(hashD, HashType.Hash);
    expect(JSON.parse(stringD)).toEqual(JSON.parse(d));
  });

  test('vector hash conversion', () => {
    const d = '[{"marty":"mcfly","thunder":"lightning"},{"doc":"brown"}]';
    const hashD = hashTypeFromString(HashType.VectorHash, d);

    expect(hashD).toBeInstanceOf(HashList);
    expect((hashD as HashList).length).toBe(2);
    expect((hashD as HashList)[0].getValue('marty')).toBe('mcfly');
    expect((hashD as HashList)[1].getValue('doc')).toBe('brown');

    const stringD = stringFromHashType(hashD, HashType.VectorHash);
    expect(JSON.parse(stringD)).toEqual(JSON.parse(d));
  });

  test('vector hash empty cases', () => {
    for (const d of ['', '[]']) {
      const hashD = hashTypeFromString(HashType.VectorHash, d);
      expect(hashD).toBeInstanceOf(HashList);
      expect((hashD as HashList).length).toBe(0);

      const stringD = stringFromHashType(hashD, HashType.VectorHash);
      expect(stringD).toBe('[]');
    }
  });
});
