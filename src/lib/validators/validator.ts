import { FloatBinding, type BaseBinding } from '../binding/BaseBinding';
import { FloatValue } from '@/karabo/data/types';
import { castNumericEdit, COMPLETE_NUMBER_PATTERN } from './castNumericEdit';
import {
  KARABO_SCHEMA_MIN_INC,
  KARABO_SCHEMA_MIN_EXC,
  KARABO_SCHEMA_MAX_INC,
  KARABO_SCHEMA_MAX_EXC,
} from '@/karabo/data/const';

const NUMBER_PREFIX_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d*)(?:[eE][+-]?\d*)?$/;
const SIGN_PATTERN = /^[+-]?$/;
const EXPONENT_PATTERN = /[eE]/;
const DIGIT_PATTERN = /\d/;

export enum ValidatorState {
  ACCEPTABLE = 'acceptable',
  INTERMEDIATE = 'intermediate',
  INVALID = 'invalid',
}

export class NumberValidator {
  constructor(
    private binding: BaseBinding | undefined,
    private decimals: number
  ) {}

  validate(text: string): ValidatorState {
    if (
      !COMPLETE_NUMBER_PATTERN.test(text) &&
      !NUMBER_PREFIX_PATTERN.test(text) &&
      !SIGN_PATTERN.test(text)
    ) {
      return ValidatorState.INVALID;
    }
    // An exponent requires a numeric mantissa, even in an unfinished draft.
    const mantissa = text.split(EXPONENT_PATTERN)[0];
    if (EXPONENT_PATTERN.test(text) && !DIGIT_PATTERN.test(mantissa)) {
      return ValidatorState.INVALID;
    }
    const fractionalDigits = mantissa.split('.')[1]?.length ?? 0;
    if (this.decimals >= 0 && fractionalDigits > this.decimals) {
      return ValidatorState.INVALID;
    }
    if (!COMPLETE_NUMBER_PATTERN.test(text)) {
      return ValidatorState.INTERMEDIATE;
    }
    if (!this.binding) {
      return ValidatorState.INTERMEDIATE;
    }
    const value = Number(text);
    if (
      this.binding instanceof FloatBinding &&
      (value < FloatValue.MIN || value > FloatValue.MAX)
    ) {
      return ValidatorState.INTERMEDIATE;
    }
    const wrapped = castNumericEdit(this.binding, value);
    if (
      !wrapped ||
      !this.insideLimits(value) ||
      !this.insideLimits(wrapped.value_)
    ) {
      return ValidatorState.INTERMEDIATE;
    }
    return ValidatorState.ACCEPTABLE;
  }

  private insideLimits(value: number): boolean {
    const binding = this.binding!;
    const attrs = binding.attributes;
    if (
      attrs.has(KARABO_SCHEMA_MIN_INC) &&
      value < attrs.getValue<number>(KARABO_SCHEMA_MIN_INC)
    ) {
      return false;
    }
    if (
      attrs.has(KARABO_SCHEMA_MIN_EXC) &&
      value <= attrs.getValue<number>(KARABO_SCHEMA_MIN_EXC)
    ) {
      return false;
    }
    if (
      attrs.has(KARABO_SCHEMA_MAX_INC) &&
      value > attrs.getValue<number>(KARABO_SCHEMA_MAX_INC)
    ) {
      return false;
    }
    if (
      attrs.has(KARABO_SCHEMA_MAX_EXC) &&
      value >= attrs.getValue<number>(KARABO_SCHEMA_MAX_EXC)
    ) {
      return false;
    }
    return binding.options.length === 0 || binding.options.includes(value);
  }
}
