import { HashAttributes } from '@/karabo/data/api';
import { FloatValue } from '@/karabo/data/types';
import { DoubleBinding, FloatBinding } from '../../binding/api';
import { NumberValidator, ValidatorState } from '../validator';

it.each([Math.fround(FloatValue.MIN), Math.fround(FloatValue.MAX)])(
  'rejects the exact float32 boundary beyond the binding cast limit %p',
  (value) => {
    expect(
      new NumberValidator(new FloatBinding(), -1).validate(String(value))
    ).toBe(ValidatorState.INTERMEDIATE);
  }
);

it.each([
  [{ minInc: -2, maxExc: 4 }, '-2', ValidatorState.ACCEPTABLE],
  [{ minInc: -2, maxExc: 4 }, '4', ValidatorState.INTERMEDIATE],
  [{ minInc: -2 }, '-2.1', ValidatorState.INTERMEDIATE],
  [{ minExc: 0, maxInc: 2 }, '0', ValidatorState.INTERMEDIATE],
  [{ minExc: 0, maxInc: 2 }, '2', ValidatorState.ACCEPTABLE],
  [{ options: [1, 2] }, '3', ValidatorState.INTERMEDIATE],
  [{ options: [1, 2] }, '2', ValidatorState.ACCEPTABLE],
] as const)(
  'enforces schema constraints %p on %p',
  (attributes, text, state) => {
    const binding = new DoubleBinding({
      attributes: new HashAttributes(attributes),
    });
    expect(new NumberValidator(binding, -1).validate(text)).toBe(state);
  }
);

it.each([{ maxExc: 1 }, { minInc: 1 }])(
  'checks both the entered and rounded float32 value against %p',
  (attributes) => {
    const binding = new FloatBinding({
      attributes: new HashAttributes(attributes),
    });
    expect(new NumberValidator(binding, -1).validate('0.999999999')).toBe(
      ValidatorState.INTERMEDIATE
    );
  }
);

it.each([
  ['1.23', ValidatorState.ACCEPTABLE],
  ['1.23e2', ValidatorState.ACCEPTABLE],
  ['0', ValidatorState.ACCEPTABLE],
  ['1.234', ValidatorState.INVALID],
  ['1.234e2', ValidatorState.INVALID],
  ['abc', ValidatorState.INVALID],
  [' 1', ValidatorState.INVALID],
  ['1 ', ValidatorState.INVALID],
  ['1e2.3', ValidatorState.INVALID],
  ['0x10', ValidatorState.INVALID],
  ['', ValidatorState.INTERMEDIATE],
  ['-', ValidatorState.INTERMEDIATE],
  ['+', ValidatorState.INTERMEDIATE],
  ['.', ValidatorState.INTERMEDIATE],
  ['-.', ValidatorState.INTERMEDIATE],
  ['1e', ValidatorState.INTERMEDIATE],
  ['1e-', ValidatorState.INTERMEDIATE],
  ['1e+', ValidatorState.INTERMEDIATE],
  ['1e999', ValidatorState.INTERMEDIATE],
] as const)('classifies %j as %s', (text, state) => {
  expect(new NumberValidator(new DoubleBinding(), 2).validate(text)).toBe(
    state
  );
});

it('allows unlimited fractional precision and checks current schema limits/options', () => {
  expect(
    new NumberValidator(new DoubleBinding(), -1).validate('1.23456e-2')
  ).toBe(ValidatorState.ACCEPTABLE);
  const binding = new DoubleBinding({
    attributes: new HashAttributes({ minInc: -2, maxExc: 4 }),
  });
  const validator = new NumberValidator(binding, -1);
  expect(validator.validate('-2')).toBe(ValidatorState.ACCEPTABLE);
  expect(validator.validate('4')).toBe(ValidatorState.INTERMEDIATE);
  binding.attributes = new HashAttributes({ minExc: -2, maxInc: 4 });
  expect(validator.validate('-2')).toBe(ValidatorState.INTERMEDIATE);
  expect(validator.validate('4')).toBe(ValidatorState.ACCEPTABLE);
  binding.options = [1, 2];
  expect(validator.validate('3')).toBe(ValidatorState.INTERMEDIATE);
  expect(validator.validate('2')).toBe(ValidatorState.ACCEPTABLE);
  expect(new NumberValidator(new FloatBinding(), -1).validate('1e39')).toBe(
    ValidatorState.INTERMEDIATE
  );
  expect(new NumberValidator(undefined, -1).validate('3')).toBe(
    ValidatorState.INTERMEDIATE
  );
});
