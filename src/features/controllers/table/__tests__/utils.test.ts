import {
  BaseBinding,
  BoolBinding,
  DoubleBinding,
  FloatBinding,
  Int8Binding,
  Int64Binding,
  UInt64Binding,
  Int16Binding,
  Int32Binding,
  UInt8Binding,
  UInt16Binding,
  UInt32Binding,
  StringBinding,
} from '@/lib/binding/api';
import { HashAttributes, HashType } from '@/karabo/data/api';
import { BindingValidator } from '../BindingValidator';
import { getMinMax } from '../getMinMax';
import { formatTableCell } from '../formatTableCell';

test('validator forwards values and errors without changing the binding', () => {
  const binding = new BaseBinding();
  const result = {};
  const validate = jest.spyOn(binding, 'validateValue').mockReturnValue(result);
  const validator = new BindingValidator(binding);
  expect(validator.validate('input')).toBe(result);
  expect(validate).toHaveBeenCalledWith('input');
  expect(binding.value).toBeUndefined();
  expect(binding.timestamp).toBeUndefined();
  const error = new Error('invalid');
  validate.mockImplementation(() => {
    throw error;
  });
  expect(() => validator.validate('bad')).toThrow(error);
});

test.each([
  [Int16Binding, -32768, 32767],
  [Int32Binding, -(2 ** 31), 2 ** 31 - 1],
  [UInt8Binding, 0, 255],
  [UInt16Binding, 0, 65535],
  [UInt32Binding, 0, 2 ** 32 - 1],
] as const)('native bounds for %p', (Binding, low, high) => {
  expect(getMinMax(new Binding())).toEqual([low, high]);
});

test('validator retains existing numeric casting without schema limit or options checks', () => {
  const binding = new Int8Binding({
    attributes: new HashAttributes({ minInc: 10, maxInc: 20, options: [10] }),
  });
  const value = new BindingValidator(binding).validate(5);
  expect(value?.value_).toBe(5);
  expect(binding.value).toBeUndefined();
});

test('native limits retain bigint precision and unsupported bindings have no limits', () => {
  expect(getMinMax(new Int8Binding())).toEqual([-128, 127]);
  expect(getMinMax(new Int64Binding())).toEqual([
    -(1n << 63n),
    (1n << 63n) - 1n,
  ]);
  expect(getMinMax(new UInt64Binding())).toEqual([0n, (1n << 64n) - 1n]);
  expect(getMinMax(new BoolBinding())).toEqual([undefined, undefined]);
  expect(getMinMax(new DoubleBinding())).toEqual([
    -Number.MAX_VALUE,
    Number.MAX_VALUE,
  ]);
  expect(getMinMax(new FloatBinding())).toEqual([
    -3.4028234663852886e38, 3.4028234663852886e38,
  ]);
});

test('numeric subclasses retain their native display limits', () => {
  class CustomIntegerBinding extends Int16Binding {}
  class CustomFloatBinding extends FloatBinding {}
  expect(getMinMax(new CustomIntegerBinding())).toEqual([-32768, 32767]);
  expect(getMinMax(new CustomFloatBinding())).toEqual([
    -3.4028234663852886e38, 3.4028234663852886e38,
  ]);
});

test('exclusive limits take precedence and integers adjust by one', () => {
  const attributes = new HashAttributes({
    minInc: 0,
    minExc: 5,
    maxInc: 100,
    maxExc: 10,
  });
  expect(getMinMax(new Int8Binding({ attributes }))).toEqual([6, 9]);
  const big = new HashAttributes({
    minExc: (1n << 63n) - 4n,
    maxExc: (1n << 63n) - 1n,
  });
  expect(getMinMax(new Int64Binding({ attributes: big }))).toEqual([
    (1n << 63n) - 3n,
    (1n << 63n) - 2n,
  ]);
});

test.each([
  [Int8Binding, 6, 9],
  [UInt8Binding, 6, 9],
  [Int16Binding, 6, 9],
  [UInt16Binding, 6, 9],
  [Int32Binding, 6, 9],
  [UInt32Binding, 6, 9],
  [Int64Binding, 6n, 9n],
  [UInt64Binding, 6n, 9n],
] as const)(
  'exclusive bounds retain the value type for %p',
  (Binding, low, high) => {
    const attributes = new HashAttributes({
      minInc: 0,
      minExc: 5,
      maxInc: 100,
      maxExc: 10,
    });
    expect(getMinMax(new Binding({ attributes }))).toEqual([low, high]);
  }
);

test('inclusive bounds are retained when exclusive attributes are null', () => {
  const attributes = new HashAttributes({
    minInc: 2n,
    minExc: null,
    maxInc: 20n,
    maxExc: null,
  });
  expect(getMinMax(new UInt64Binding({ attributes }))).toEqual([2n, 20n]);
});

test.each([FloatBinding, DoubleBinding])(
  'floating exclusive limits use the precision epsilon and tiny',
  (Binding) => {
    const epsilon = Binding === FloatBinding ? 2 ** -23 : Number.EPSILON;
    const tiny = Binding === FloatBinding ? 2 ** -126 : 2 ** -1022;
    const attributes = new HashAttributes({ minExc: -1, maxExc: 1 });
    expect(getMinMax(new Binding({ attributes }))).toEqual([
      -1 * (1 - epsilon) + tiny,
      1 * (1 - epsilon) - tiny,
    ]);
    expect(
      getMinMax(
        new Binding({
          attributes: new HashAttributes({ minExc: 0, maxExc: 0 }),
        })
      )
    ).toEqual([tiny, -tiny]);
  }
);

test('public validation forwards to protected subclass hooks', () => {
  class CustomBinding extends BaseBinding<string> {
    protected override validate(value: unknown) {
      if (value === 'bad') {
        throw new Error('invalid');
      }
      return String(value).toUpperCase();
    }
  }
  const binding = new CustomBinding();
  expect(new BindingValidator(binding).validate('input')).toBe('INPUT');
  expect(binding.validateValue('next')).toBe('NEXT');
  expect(() => binding.validateValue('bad')).toThrow('invalid');
  expect(binding.value).toBeUndefined();
});

test.each([
  [new Int8Binding(), 12, '12'],
  [new Int64Binding(), (1n << 63n) - 1n, '9223372036854775807'],
  [new StringBinding(), 'plain', 'plain'],
  [new BoolBinding(), false, 'false'],
  [new BoolBinding(), true, 'true'],
  [new DoubleBinding(), 1, '1.000'],
  [new DoubleBinding(), 'invalid', 'invalid'],
  [new DoubleBinding(), Infinity, 'Infinity'],
] as const)(
  'formats %p value %p without changing displayed strings',
  (column, value, expected) => {
    if (column instanceof DoubleBinding) {
      column.hashType = HashType.Double;
    }
    expect(formatTableCell(value, column)).toBe(expected);
  }
);
