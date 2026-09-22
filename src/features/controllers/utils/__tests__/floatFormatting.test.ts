import { formatFloatValue } from '../floatFormatting';

test.each([
  [0.0001, '8', '0.0001'],
  [0.00001, '8', '1e-5'],
  [99999999, '8', '99999999'],
  [100000000, '8', '1e+8'],
  [99999999.9, '8', '1e+8'],
  [0.0000999999999, '8', '0.0001'],
  [1.23, '8', '1.23'],
  [0, '8', '0'],
  [-0, '8', '0'],
  [-0.00001, '8', '-1e-5'],
  [-99999999.9, '8', '-1e+8'],
  [12, '0', '1e+1'],
  [-Infinity, '8', '-inf'],
  [Infinity, '8', 'inf'],
])(
  'general formatting of %s with precision %s uses general-format notation thresholds',
  (value, precision, expected) => {
    expect(formatFloatValue(value, 'g', precision)).toBe(expected);
  }
);
