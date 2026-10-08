import {
  BaseBinding,
  FloatBinding,
  DoubleBinding,
} from '../binding/BaseBinding';
import { FloatValue, DoubleValue } from '@/karabo/data/types';

export const COMPLETE_NUMBER_PATTERN =
  /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export function castNumericEdit(
  binding: BaseBinding,
  value: unknown
): FloatValue | DoubleValue | undefined {
  if (!(binding instanceof FloatBinding || binding instanceof DoubleBinding)) {
    return undefined;
  }
  if (value instanceof FloatValue || value instanceof DoubleValue) {
    value = value.value_;
  }
  if (typeof value === 'string' && COMPLETE_NUMBER_PATTERN.test(value)) {
    value = Number(value);
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  const klass = binding instanceof FloatBinding ? FloatValue : DoubleValue;
  const wrapped = new klass(value);
  return Number.isFinite(wrapped.value_) ? wrapped : undefined;
}
