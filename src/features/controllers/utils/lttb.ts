import { isTypedArray } from '@/karabo/data/api';

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

/**
 * Apply the controller's sampling window before LTTB selection. Typed vectors
 * use views; other array-like inputs copy only the selected window. Complete
 * vectors are reused. The controller supplies equal lengths and the threshold.
 */
export function lttbWithCoordinates({
  x,
  y,
  start = 0,
  end = x.length,
  threshold,
}: {
  x: ArrayLike<number>;
  y: ArrayLike<number>;
  start?: number;
  end?: number;
  threshold: number;
}): { x: number; y: number }[] {
  const length = x.length;
  start = Math.max(0, Math.min(start, length));
  end = Math.max(start, Math.min(end, length));
  return lttb({
    x: sliceVector({ values: x, start, end }),
    y: sliceVector({ values: y, start, end }),
    threshold,
  });
}

function sliceVector({
  values,
  start,
  end,
}: {
  values: ArrayLike<number>;
  start: number;
  end: number;
}): ArrayLike<number> {
  if (start === 0 && end === values.length) {
    return values;
  }
  if (
    isTypedArray(values) &&
    !(values instanceof BigInt64Array) &&
    !(values instanceof BigUint64Array)
  ) {
    return values.subarray(start, end);
  }
  if (Array.isArray(values)) {
    return values.slice(start, end);
  }
  return Float64Array.from(
    { length: end - start },
    (_, index) => values[start + index]
  );
}

/** Select Chart.js points from equally sized vectors using actual X coordinates. */
export function lttb({
  x,
  y,
  threshold,
}: {
  x: ArrayLike<number>;
  y: ArrayLike<number>;
  threshold: number;
}): { x: number; y: number }[] {
  const n = x.length;
  const size = Math.min(Math.max(threshold, 0), n);
  const points: { x: number; y: number }[] = new Array(size);
  if (size === 0) {
    return points;
  }

  if (threshold >= n) {
    for (let index = 0; index < n; index++) {
      points[index] = { x: x[index], y: y[index] };
    }
    return points;
  }

  if (threshold === 1) {
    points[0] = { x: x[0], y: y[0] };
    return points;
  }
  if (threshold === 2) {
    points[0] = { x: x[0], y: y[0] };
    points[1] = { x: x[n - 1], y: y[n - 1] };
    return points;
  }

  points[0] = { x: x[0], y: y[0] };
  points[threshold - 1] = { x: x[n - 1], y: y[n - 1] };

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
    let cy = y[n - 1];
    let cx = x[n - 1];
    if (c > 0) {
      cy = sy / c;
      cx = sx / c;
    }

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

    points[bucketIndex + 1] = {
      x: x[bestIndex],
      y: y[bestIndex],
    };
    lastSelectedIndex = bestIndex;
  }
  return points;
}
