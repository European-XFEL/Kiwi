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
  threshold ??=
    count > 500_000
      ? 60_000
      : count > 400_000
        ? 50_000
        : count > 300_000
          ? 40_000
          : count > 200_000
            ? 30_000
            : 20_000;
  return lttb(
    x ?? Float64Array.from({ length }, (_, i) => i),
    y,
    threshold,
    start,
    end
  );
}

/**
 * Largest-Triangle-Three-Buckets using actual X coordinates.
 * Reads the paired [start, end) window without changing the inputs.
 */
export function lttb(
  x: ArrayLike<number>,
  y: ArrayLike<number>,
  threshold: number,
  start = 0,
  end = Math.min(x.length, y.length)
): [Float64Array, Float64Array] {
  const length = Math.min(x.length, y.length);
  const offset = Math.max(0, Math.min(start, length));
  const limit = Math.max(offset, Math.min(end, length));
  const n = limit - offset;
  const valueAt = (index: number) => y[offset + index];

  const size = Math.min(Math.max(threshold, 0), n);
  const sampledX = new Float64Array(size);
  const sampledY = new Float64Array(size);
  const points: [Float64Array, Float64Array] = [sampledX, sampledY];
  if (size === 0) return points;

  if (threshold >= n) {
    for (let index = 0; index < n; index++) {
      sampledX[index] = x[offset + index];
      sampledY[index] = y[offset + index];
    }
    return points;
  }

  if (threshold === 1) {
    sampledX[0] = x[offset];
    sampledY[0] = y[offset];
    return points;
  }
  if (threshold === 2) {
    sampledX[0] = x[offset];
    sampledY[0] = y[offset];
    sampledX[1] = x[limit - 1];
    sampledY[1] = y[limit - 1];
    return points;
  }

  sampledX[0] = x[offset];
  sampledY[0] = y[offset];
  sampledX[threshold - 1] = x[limit - 1];
  sampledY[threshold - 1] = y[limit - 1];

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
      sx += x[offset + i];
      sy += valueAt(i);
      c++;
    }
    const cy = c === 0 ? valueAt(n - 1) : sy / c;

    const cx = c === 0 ? x[limit - 1] : sx / c;

    // A = last selected
    const ax = x[offset + lastSelectedIndex];
    const ay = valueAt(lastSelectedIndex);

    let bestArea2 = -1;
    let bestIndex = currStart;

    for (let j = currStart; j < currEnd; j++) {
      const bx = x[offset + j];
      const by = valueAt(j);

      const area2 = Math.abs((ax - cx) * (by - ay) - (ax - bx) * (cy - ay));
      if (area2 > bestArea2) {
        bestArea2 = area2;
        bestIndex = j;
      }
    }

    sampledX[bucketIndex + 1] = x[offset + bestIndex];
    sampledY[bucketIndex + 1] = y[offset + bestIndex];
    lastSelectedIndex = bestIndex;
  }
  return points;
}
