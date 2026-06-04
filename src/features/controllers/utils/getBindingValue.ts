import { stringFromHashType } from '@/karabo/data/api';

export const getBindingValue = (proxy: any, fallback: any = undefined): any => {
  const value = proxy?.value;
  return value === undefined ? fallback : value;
};

export const formatUnitLabelSuffix = (proxy: any): string => {
  const unitLabel = proxy?.binding?.unit_label;
  return unitLabel ? ` ${unitLabel}` : '';
};

export const formatFloatValue = (
  value: unknown,
  fmt: string,
  decimals: number | string
): string => {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);

  const parsedDecimals =
    typeof decimals === 'string' ? parseInt(decimals, 10) : decimals;
  const p = Math.max(0, Number.isFinite(parsedDecimals) ? parsedDecimals : 8);

  if (fmt === 'f') return num.toFixed(p);
  if (fmt === 'e') return num.toExponential(p);
  return parseFloat(num.toPrecision(p)).toString();
};

export const toStringValue = (
  proxy: any,
  withUnit: boolean = false
): string => {
  const value = getBindingValue(proxy);
  if (value === undefined) return '';

  const unitSuffix = withUnit ? formatUnitLabelSuffix(proxy) : '';
  return `${stringFromHashType(value, proxy?.binding?.hashType)}${unitSuffix}`;
};

export const toStringNumberValue = (
  proxy: any,
  fmt: string,
  decimals: number | string,
  withUnit: boolean = false
): string => {
  const value = getBindingValue(proxy);
  if (value === undefined) return '';

  const unitSuffix = withUnit ? formatUnitLabelSuffix(proxy) : '';
  return `${formatFloatValue(value, fmt, decimals)}${unitSuffix}`;
};
