import type { Range } from './common/constants';

const tickValueFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});
export function formatValueTick(value: number) {
  const magnitude = Math.abs(value);
  if (magnitude !== 0 && (magnitude < 0.01 || magnitude >= 1e9))
    return value
      .toExponential(2)
      .replace(/\.00e/, 'e')
      .replace(/(\.\d)0e/, '$1e');
  return tickValueFormat.format(value);
}

export function integerTickFormatter(labels: ReadonlyMap<number, string>) {
  return (value: number) =>
    (Number.isInteger(value) ? labels.get(value) : undefined) ??
    formatValueTick(value);
}

export const VECTOR_POINT_LIMIT = 300;

export function chooseVectorTargetPoints(length: number) {
  return length >= 1_500_000 ? 60_000 : length;
}

export const BAR_SAMPLE_LIMIT = 3000;

export function visibleVectorRange(
  pointCount: number,
  range?: Range,
  logarithmic = false,
  { offset = 0, step = 1 }: { offset?: number; step?: number } = {}
) {
  if (!range || pointCount === 0) return [0, pointCount] as const;
  const [min, max] = range;
  const ratio = max / min;
  const logarithmicPadding = logarithmic && min > 0 && ratio > 1;
  const span = max - min;
  const paddedMin = logarithmicPadding ? min / ratio : min - span;
  const paddedMax = logarithmicPadding ? max * ratio : max + span;
  step ||= 1;
  const firstIndex = (paddedMin - offset) / step;
  const lastIndex = (paddedMax - offset) / step;
  const lower = Math.min(firstIndex, lastIndex);
  const upper = Math.max(firstIndex, lastIndex);
  if (upper < 0 || lower > pointCount - 1) return [0, 0] as const;
  const firstPoint = Math.max(0, Math.floor(lower));
  const lastPoint = Math.min(pointCount, Math.ceil(upper) + 1);
  return [firstPoint, Math.max(firstPoint, lastPoint)] as const;
}

export function vectorPoints(points: Float64Array) {
  const data: { x: number; y: number }[] = [];
  for (let index = 0; index < points.length; index += 2)
    data.push({ x: points[index], y: points[index + 1] });
  return data;
}
