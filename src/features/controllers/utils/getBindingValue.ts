import { stringFromHashType } from '@/karabo/data/api';
import { FloatBinding, type PropertyProxy } from '@/lib/binding/api';
import { formatFloatValue, normalizeFloat32 } from './floatFormatting';

export const getBindingValue = (
  proxy: PropertyProxy | undefined,
  fallback: unknown = undefined
): unknown => {
  const value = proxy?.value;
  return value === undefined ? fallback : value;
};

export const formatUnitLabelSuffix = (
  proxy: PropertyProxy | undefined
): string => {
  const unitLabel = proxy?.binding?.unit_label;
  return unitLabel ? ` ${unitLabel}` : '';
};

export const toStringValue = (
  proxy: PropertyProxy | undefined,
  withUnit: boolean = false
): string => {
  const value = getBindingValue(proxy);
  if (value === undefined) return '';

  const unitSuffix = withUnit ? formatUnitLabelSuffix(proxy) : '';
  return `${stringFromHashType(value, proxy?.binding?.hashType)}${unitSuffix}`;
};

export const toStringFloatValue = (
  proxy: PropertyProxy | undefined,
  fmt: string = 'g',
  decimals: string = '8',
  withUnit: boolean = false
): string => {
  const value = getBindingValue(proxy);
  if (value === undefined) return '';

  const binding = proxy?.binding;
  const unitSuffix = withUnit ? formatUnitLabelSuffix(proxy) : '';
  const num = Number(value);
  const displayValue =
    binding instanceof FloatBinding ? normalizeFloat32(num) : num;
  return `${formatFloatValue(displayValue, fmt, decimals)}${unitSuffix}`;
};
