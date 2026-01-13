import { splitKaraboKeys } from '@/lib/binding/utils/splitKaraboKeys';

describe('splitKaraboKeys (uses last dot)', () => {
  it.each([
    ['DEVICE_X.state', { deviceId: 'DEVICE_X', propertyPath: 'state' }],
    [
      'DETLAB_LAB_AGIPD1M1/CTRL/MC1.aux',
      { deviceId: 'DETLAB_LAB_AGIPD1M1/CTRL/MC1', propertyPath: 'aux' },
    ],

    ['A.B.C.prop.name', { deviceId: 'A', propertyPath: 'B.C.prop.name' }],

    ['.state', { deviceId: '', propertyPath: 'state' }],

    ['DEV.ID', { deviceId: 'DEV', propertyPath: 'ID' }],
  ])('splits "%s"', (input, expected) => {
    expect(splitKaraboKeys(input)).toEqual(expected);
  });

  describe('edge cases', () => {
    it('empty string → device: "", property: ""', () => {
      expect(splitKaraboKeys('')).toEqual({ deviceId: '', propertyPath: '' });
    });
  });
});
