/**
 * LTTB (Largest-Triangle-Three-Buckets) Downsampling Algorithm
 *
 * Reference: Algorithm 4.2 from Steinarsson (2013)
 * https://skemman.is/bitstream/1946/15343/3/SS_MSthesis.pdf
 */

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type XYPoint = readonly [number, number];

interface CoreResult {
  points: XYPoint[];
  positions?: number[]; // positions in the input array
}

// ─────────────────────────────────────────────────────────────────
// Core LTTB for XYPoint[] (single source of truth)
// ─────────────────────────────────────────────────────────────────

const lttbCore = (
  data: XYPoint[],
  threshold: number,
  wantPositions: boolean
): CoreResult => {
  const n = data.length;

  if (threshold <= 0 || n === 0) {
    return { points: [], positions: wantPositions ? [] : undefined };
  }

  if (threshold >= n) {
    return {
      points: data.slice(),
      positions: wantPositions
        ? Array.from({ length: n }, (_, i) => i)
        : undefined,
    };
  }

  if (threshold === 1) {
    return { points: [data[0]], positions: wantPositions ? [0] : undefined };
  }

  if (threshold === 2) {
    return {
      points: [data[0], data[n - 1]],
      positions: wantPositions ? [0, n - 1] : undefined,
    };
  }

  const points: XYPoint[] = new Array(threshold);
  const positions: number[] | undefined = wantPositions
    ? new Array(threshold)
    : undefined;

  points[0] = data[0];
  points[threshold - 1] = data[n - 1];

  if (positions) {
    positions[0] = 0;
    positions[threshold - 1] = n - 1;
  }

  const bucketSize = (n - 2) / (threshold - 2);
  let lastSelectedIndex = 0;

  for (let bucketIndex = 0; bucketIndex < threshold - 2; bucketIndex++) {
    // Current bucket boundaries
    let currStart = Math.floor(bucketIndex * bucketSize) + 1;
    let currEnd = Math.floor((bucketIndex + 1) * bucketSize) + 1;
    currStart = Math.max(1, Math.min(currStart, n - 1));
    currEnd = Math.max(currStart + 1, Math.min(currEnd, n - 1));

    // Next bucket boundaries (for average)
    let nextStart = Math.floor((bucketIndex + 1) * bucketSize) + 1;
    let nextEnd = Math.floor((bucketIndex + 2) * bucketSize) + 1;
    nextStart = Math.max(1, Math.min(nextStart, n));
    nextEnd = Math.max(nextStart, Math.min(nextEnd, n));

    // Average point of next bucket (C) — fallback to last point if empty
    let sx = 0,
      sy = 0,
      c = 0;
    for (let i = nextStart; i < nextEnd; i++) {
      const p = data[i];
      sx += p[0];
      sy += p[1];
      c++;
    }
    const cx = c === 0 ? data[n - 1][0] : sx / c;
    const cy = c === 0 ? data[n - 1][1] : sy / c;

    // A = previously selected point
    const ax = data[lastSelectedIndex][0];
    const ay = data[lastSelectedIndex][1];

    // Choose best B in current bucket by max (2×area)
    let bestArea2 = -1;
    let bestIndex = currStart;

    for (let j = currStart; j < currEnd; j++) {
      const p = data[j];
      const bx = p[0];
      const by = p[1];

      const area2 = Math.abs((ax - cx) * (by - ay) - (ax - bx) * (cy - ay));
      if (area2 > bestArea2) {
        bestArea2 = area2;
        bestIndex = j;
      }
    }

    points[bucketIndex + 1] = data[bestIndex];
    if (positions) positions[bucketIndex + 1] = bestIndex;

    lastSelectedIndex = bestIndex;
  }

  return { points, positions };
};

// ─────────────────────────────────────────────────────────────────
// Public API: XYPoint[]
// ─────────────────────────────────────────────────────────────────

export const lttb = (data: XYPoint[], threshold: number): XYPoint[] =>
  lttbCore(data, threshold, false).points;

export const lttbWithPositions = (
  data: XYPoint[],
  threshold: number
): { points: XYPoint[]; positions: number[] } => {
  const r = lttbCore(data, threshold, true);
  return { points: r.points, positions: r.positions ?? [] };
};

// ─────────────────────────────────────────────────────────────────
// Public API: 1D number[] (FAST: no XYPoint[] allocation)
// ─────────────────────────────────────────────────────────────────

/**
 * Downsample a 1D number array where x = index.
 *
 * This version is optimized for big vectors: it DOES NOT allocate XYPoint[].
 */
export const downsampleArray = (
  values: number[],
  threshold: number
): { values: number[]; indices: number[] } => {
  const n = values.length;

  if (threshold <= 0 || n === 0) return { values: [], indices: [] };

  if (threshold >= n) {
    return {
      values: values.slice(),
      indices: Array.from({ length: n }, (_, i) => i),
    };
  }

  if (threshold === 1) return { values: [values[0]], indices: [0] };
  if (threshold === 2)
    return { values: [values[0], values[n - 1]], indices: [0, n - 1] };

  const outValues = new Array<number>(threshold);
  const outIndices = new Array<number>(threshold);

  outValues[0] = values[0];
  outIndices[0] = 0;

  outValues[threshold - 1] = values[n - 1];
  outIndices[threshold - 1] = n - 1;

  const bucketSize = (n - 2) / (threshold - 2);
  let lastSelectedIndex = 0;

  for (let bucketIndex = 0; bucketIndex < threshold - 2; bucketIndex++) {
    // Current bucket boundaries
    let currStart = Math.floor(bucketIndex * bucketSize) + 1;
    let currEnd = Math.floor((bucketIndex + 1) * bucketSize) + 1;
    currStart = Math.max(1, Math.min(currStart, n - 1));
    currEnd = Math.max(currStart + 1, Math.min(currEnd, n - 1));

    // Next bucket boundaries
    let nextStart = Math.floor((bucketIndex + 1) * bucketSize) + 1;
    let nextEnd = Math.floor((bucketIndex + 2) * bucketSize) + 1;
    nextStart = Math.max(1, Math.min(nextStart, n));
    nextEnd = Math.max(nextStart, Math.min(nextEnd, n));

    // Next bucket average: C = (avgX, avgY)
    // avgY: average of values
    let sy = 0;
    let c = 0;
    for (let i = nextStart; i < nextEnd; i++) {
      sy += values[i];
      c++;
    }
    const cy = c === 0 ? values[n - 1] : sy / c;

    // avgX for consecutive integers [nextStart .. nextEnd-1]
    const cx = c === 0 ? n - 1 : (nextStart + (nextEnd - 1)) / 2;

    // A = last selected
    const ax = lastSelectedIndex;
    const ay = values[lastSelectedIndex];

    let bestArea2 = -1;
    let bestIndex = currStart;

    for (let j = currStart; j < currEnd; j++) {
      const bx = j;
      const by = values[j];

      const area2 = Math.abs((ax - cx) * (by - ay) - (ax - bx) * (cy - ay));
      if (area2 > bestArea2) {
        bestArea2 = area2;
        bestIndex = j;
      }
    }

    outIndices[bucketIndex + 1] = bestIndex;
    outValues[bucketIndex + 1] = values[bestIndex];
    lastSelectedIndex = bestIndex;
  }

  return { values: outValues, indices: outIndices };
};

export default lttb;
