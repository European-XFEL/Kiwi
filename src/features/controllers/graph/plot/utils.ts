import type { Range } from '../types';
import { isTypedArray } from '@/karabo/data/api';
import { formatValueTick } from '../utils';

export type VectorData = ArrayLike<number>;

export function normalizeVector(raw: unknown): VectorData {
  if (!raw) return new Float64Array();
  if (isTypedArray(raw)) {
    if (!(raw instanceof BigInt64Array) && !(raw instanceof BigUint64Array))
      return raw;
  } else if (!Array.isArray(raw)) {
    return new Float64Array();
  }
  const normalized = new Float64Array(raw.length);
  for (let index = 0; index < raw.length; index++) {
    normalized[index] = Number(raw[index]);
  }
  return normalized;
}

export function integerTickFormatter(labels: ReadonlyMap<number, string>) {
  return (value: number) =>
    (Number.isInteger(value) ? labels.get(value) : undefined) ??
    formatValueTick(value);
}

export const BAR_SAMPLE_LIMIT = 3000;

/** Generate X coordinates from the baseline offset and step. */
export function generateBaseline(
  data: ArrayLike<number>,
  offset = 0,
  step = 1
) {
  step = step || 1;
  return Float64Array.from(
    { length: data.length },
    (_, index) => offset + index * step
  );
}

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

/**
 * Locate the sampling window in source coordinates. The controller pads the
 * viewport and chooses the threshold from the returned window length.
 */
export function getSamplingWindow({
  x,
  range,
}: {
  x: VectorData;
  range?: Range;
}): { start: number; end: number } {
  const length = x.length;
  const step = (x[length - 1] - x[0]) / (length - 1);
  let start = 0;
  let end = length;
  // Like KaraboGui, estimate spacing from the paired endpoints and leave small
  // or degenerate pairs whole.
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
  return { start, end };
}
