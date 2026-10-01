import type { Range } from '../common/api';

export function fixedVectorRange(
  autorange: boolean,
  min: number,
  max: number
): Range | undefined {
  return autorange ||
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    min === max
    ? undefined
    : [min, max];
}

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
