import type { Range } from './common/constants';
import { lttbWithCoordinates } from '../utils/lttb';
import { isTypedArray } from '@/karabo/data/api';

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

const GENERAL_TICK_PRECISION = 6;
const TICK_SPACING_PRECISION = 12;

export function formatValueTick(value: number, spacing?: number) {
  if (spacing) {
    // Remove subtraction noise before logarithms choose the decimal precision.
    spacing = Number(spacing.toPrecision(TICK_SPACING_PRECISION));
  }
  const magnitude = Math.abs(value);
  // Like AxisItem.tickStrings, derive fixed-point decimals from tick spacing
  // and use compact general notation for small and large magnitudes.
  if (spacing && magnitude >= 0.001 && magnitude < 10000) {
    const places = Math.min(20, Math.max(0, Math.ceil(-Math.log10(spacing))));
    return value.toFixed(places);
  }
  let precision = GENERAL_TICK_PRECISION;
  if (spacing && magnitude > 0) {
    // Keep close large ticks distinct when zoomed beyond six significant digits.
    precision = Math.min(
      17,
      Math.max(
        precision,
        Math.floor(Math.log10(magnitude)) - Math.floor(Math.log10(spacing)) + 1
      )
    );
  }
  const rounded = Number(value.toPrecision(precision));
  const exponent = Math.floor(Math.log10(Math.abs(rounded)));
  if (rounded !== 0 && (exponent < -4 || exponent >= precision)) {
    return rounded.toExponential();
  }
  return String(rounded);
}

export function integerTickFormatter(labels: ReadonlyMap<number, string>) {
  return (value: number) =>
    (Number.isInteger(value) ? labels.get(value) : undefined) ??
    formatValueTick(value);
}

export const VECTOR_POINT_LIMIT = 300;

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

export function vectorPoints([x, y]: [VectorData, VectorData]) {
  const data: { x: number; y: number }[] = [];
  const length = Math.min(x.length, y.length);
  for (let index = 0; index < length; index++) {
    data.push({ x: x[index], y: y[index] });
  }
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
  return lttbWithCoordinates(y, x, { start, end, threshold });
}
