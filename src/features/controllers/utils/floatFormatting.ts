export function normalizeFloat32(value: number): number {
  if (!Number.isFinite(value) || value === 0) return value;

  // NumPy prints the shortest decimal that recovers the same float32.
  for (let precision = 1; precision <= 9; precision++) {
    const decimal = Number(value.toPrecision(precision));
    if (Math.fround(decimal) === value) return decimal;
  }
  return value;
}

export const formatFloatValue = (
  num: number,
  fmt: string,
  decimals: string
): string => {
  if (!Number.isFinite(num)) {
    if (Number.isNaN(num)) return 'nan';
    return num < 0 ? '-inf' : 'inf';
  }

  const p = Math.max(0, Number(decimals));

  if (fmt === 'f') return num.toFixed(p);
  if (fmt === 'e') return num.toExponential(p);

  const precision = Math.max(1, p);
  const rounded = Number(num.toPrecision(precision));
  const magnitude = Math.abs(rounded);
  if (magnitude !== 0 && (magnitude < 1e-4 || magnitude >= 10 ** precision))
    return rounded.toExponential();

  return String(rounded);
};
