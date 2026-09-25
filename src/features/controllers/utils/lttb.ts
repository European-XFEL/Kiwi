/**
 * Largest-Triangle-Three-Buckets for vectors where x is the source index.
 * Reads [start, end) without copying; returns interleaved [x, y] points.
 */
export function lttb(
  values: ArrayLike<number>,
  threshold: number,
  start = 0,
  end = values.length
): Float64Array {
  const offset = Math.max(0, Math.min(start, values.length));
  const limit = Math.max(offset, Math.min(end, values.length));
  const n = limit - offset;
  const valueAt = (index: number) => values[offset + index];

  const size = Math.min(Math.max(threshold, 0), n);
  const points = new Float64Array(size * 2);
  if (size === 0) return points;

  if (threshold >= n) {
    for (let index = 0; index < n; index++) {
      points[index * 2] = offset + index;
      points[index * 2 + 1] = values[offset + index];
    }
    return points;
  }

  if (threshold === 1) {
    points[0] = offset;
    points[1] = values[offset];
    return points;
  }
  if (threshold === 2) {
    points[0] = offset;
    points[1] = values[offset];
    points[2] = limit - 1;
    points[3] = values[limit - 1];
    return points;
  }

  points[0] = offset;
  points[1] = values[offset];
  points[(threshold - 1) * 2] = limit - 1;
  points[(threshold - 1) * 2 + 1] = values[limit - 1];

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
      sy += valueAt(i);
      c++;
    }
    const cy = c === 0 ? valueAt(n - 1) : sy / c;

    // avgX for consecutive integers [nextStart .. nextEnd-1]
    const cx = c === 0 ? n - 1 : (nextStart + (nextEnd - 1)) / 2;

    // A = last selected
    const ax = lastSelectedIndex;
    const ay = valueAt(lastSelectedIndex);

    let bestArea2 = -1;
    let bestIndex = currStart;

    for (let j = currStart; j < currEnd; j++) {
      const bx = j;
      const by = valueAt(j);

      const area2 = Math.abs((ax - cx) * (by - ay) - (ax - bx) * (cy - ay));
      if (area2 > bestArea2) {
        bestArea2 = area2;
        bestIndex = j;
      }
    }

    points[(bucketIndex + 1) * 2] = offset + bestIndex;
    points[(bucketIndex + 1) * 2 + 1] = values[offset + bestIndex];
    lastSelectedIndex = bestIndex;
  }
  return points;
}
