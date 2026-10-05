const SAMPLE_THRESHOLDS: Record<number, number> = {
  200_000: 30_000,
  300_000: 40_000,
  400_000: 50_000,
  500_000: 60_000,
};

export function getSampleThreshold(size: number) {
  let threshold = 20_000;
  for (const [points, sampleThreshold] of Object.entries(SAMPLE_THRESHOLDS)) {
    if (size > Number(points)) {
      threshold = sampleThreshold;
    } else {
      break;
    }
  }
  return threshold;
}

export function lttbWithCoordinates(
  y: ArrayLike<number>,
  x?: ArrayLike<number>,
  {
    start = 0,
    end = Math.min(y.length, x?.length ?? y.length),
    threshold,
  }: {
    start?: number;
    end?: number;
    threshold?: number;
  } = {}
): [Float64Array, Float64Array] {
  const length = Math.min(y.length, x?.length ?? y.length);
  start = Math.max(0, Math.min(start, length));
  end = Math.max(start, Math.min(end, length));
  const count = end - start;
  let clippedX: ArrayLike<number>;
  if (!x) {
    clippedX = Float64Array.from({ length: count }, (_, i) => start + i);
  } else if (start === 0 && end === x.length) {
    clippedX = x;
  } else {
    clippedX = Float64Array.from({ length: count }, (_, i) => x[start + i]);
  }
  const clippedY =
    start === 0 && end === y.length
      ? y
      : Float64Array.from({ length: count }, (_, i) => y[start + i]);
  if (threshold === undefined) {
    threshold = getSampleThreshold(count);
  }
  return lttb(clippedX, clippedY, threshold);
}

/**
 * Largest-Triangle-Three-Buckets using actual X coordinates.
 * Samples paired vectors without changing the inputs.
 */
export function lttb(
  x: ArrayLike<number>,
  y: ArrayLike<number>,
  threshold: number
): [Float64Array, Float64Array] {
  const n = Math.min(x.length, y.length);

  const size = Math.min(Math.max(threshold, 0), n);
  const sampledX = new Float64Array(size);
  const sampledY = new Float64Array(size);
  const points: [Float64Array, Float64Array] = [sampledX, sampledY];
  if (size === 0) return points;

  if (threshold >= n) {
    for (let index = 0; index < n; index++) {
      sampledX[index] = x[index];
      sampledY[index] = y[index];
    }
    return points;
  }

  if (threshold === 1) {
    sampledX[0] = x[0];
    sampledY[0] = y[0];
    return points;
  }
  if (threshold === 2) {
    sampledX[0] = x[0];
    sampledY[0] = y[0];
    sampledX[1] = x[n - 1];
    sampledY[1] = y[n - 1];
    return points;
  }

  sampledX[0] = x[0];
  sampledY[0] = y[0];
  sampledX[threshold - 1] = x[n - 1];
  sampledY[threshold - 1] = y[n - 1];

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
    let sx = 0;
    let sy = 0;
    let c = 0;
    for (let i = nextStart; i < nextEnd; i++) {
      sx += x[i];
      sy += y[i];
      c++;
    }
    const cy = c === 0 ? y[n - 1] : sy / c;

    const cx = c === 0 ? x[n - 1] : sx / c;

    // A = last selected
    const ax = x[lastSelectedIndex];
    const ay = y[lastSelectedIndex];

    let bestArea2 = -1;
    let bestIndex = currStart;

    for (let j = currStart; j < currEnd; j++) {
      const bx = x[j];
      const by = y[j];

      const area2 = Math.abs((ax - cx) * (by - ay) - (ax - bx) * (cy - ay));
      if (area2 > bestArea2) {
        bestArea2 = area2;
        bestIndex = j;
      }
    }

    sampledX[bucketIndex + 1] = x[bestIndex];
    sampledY[bucketIndex + 1] = y[bestIndex];
    lastSelectedIndex = bestIndex;
  }
  return points;
}
