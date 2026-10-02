import type { Range } from './common/constants';
import { lttbWithCoordinates } from '../utils/lttb';

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

export const BAR_SAMPLE_LIMIT = 3000;

/** Add one viewport of overscan in linear or logarithmic X coordinates. */
export function padViewportRange(
  range?: Range,
  logarithmic = false
): Range | undefined {
  if (!range) return undefined;
  const min = Math.min(...range);
  const max = Math.max(...range);
  const ratio = max / min;
  if (logarithmic && min > 0 && ratio > 1) return [min / ratio, max * ratio];
  const span = max - min;
  return [min - span, max + span];
}

export function vectorPoints([x, y]: [Float64Array, Float64Array]) {
  const data: { x: number; y: number }[] = [];
  for (let index = 0; index < x.length; index++)
    data.push({ x: x[index], y: y[index] });
  return data;
}

/** Sample complete paired vectors within a range; viewport padding is separate. */
export function generateDownsample(
  y: ArrayLike<number>,
  x: ArrayLike<number>,
  range?: Range,
  threshold?: number
) {
  const length = Math.min(x.length, y.length);
  const step = (x[length - 1] - x[0]) / (length - 1);
  let start = 0;
  let end = length;
  // Like KaraboGui, estimate spacing from the paired endpoints and leave small
  // or degenerate pairs whole. Read the window directly without vector slices.
  if (range && length > 200 && step !== 0 && Number.isFinite(step)) {
    const first = (range[0] - x[0]) / step;
    const last = (range[1] - x[0]) / step;
    const lower = Math.min(first, last);
    const upper = Math.max(first, last);
    if ([lower, upper].every(Number.isFinite)) {
      if (upper < 0 || lower > length - 1) {
        end = 0;
      } else {
        // Round outward so line segments crossing the range remain drawable.
        start = Math.max(0, Math.floor(lower));
        end = Math.min(length, Math.ceil(upper) + 1);
      }
    }
  }
  return lttbWithCoordinates(y, x, { start, end, threshold });
}
