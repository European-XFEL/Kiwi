/**
 * stress tests for LTTB (Largest-Triangle-Three-Buckets).
 *
 * Goal:
 * - Break it with adversarial inputs.
 * - Prove core invariants.
 * - Cross-check helpers (lttb, lttbWithPositions, downsampleArray).
 */

import { performance } from 'node:perf_hooks';
import {
  lttb,
  lttbWithPositions,
  downsampleArray,
  type XYPoint,
} from '@/shared/helpers/lttb';

// ─────────────────────────────────────────────────────────────────
// Deterministic helpers (avoid flaky tests)
// ─────────────────────────────────────────────────────────────────

/** Deterministic PRNG (Mulberry32) */
const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

const assertStrictlyIncreasing = (arr: number[]) => {
  for (let i = 1; i < arr.length; i++) {
    expect(arr[i]).toBeGreaterThan(arr[i - 1]);
  }
};

const assertMonotonicIncreasingX = (pts: XYPoint[]) => {
  for (let i = 1; i < pts.length; i++) {
    expect(pts[i][0]).toBeGreaterThan(pts[i - 1][0]);
  }
};

const assertAllPointsFromOriginal = (
  original: XYPoint[],
  sampled: XYPoint[]
) => {
  // Use a Set for faster membership checks.
  const set = new Set(original.map(([x, y]) => `${x}::${y}`));
  for (const [x, y] of sampled) {
    expect(set.has(`${x}::${y}`)).toBe(true);
  }
};

const assertFinitePoints = (pts: XYPoint[]) => {
  for (const [x, y] of pts) {
    expect(Number.isFinite(x)).toBe(true);
    expect(Number.isFinite(y)).toBe(true);
  }
};

const makeSine = (
  n: number,
  amplitude = 1,
  freq = 1,
  noise = 0,
  seed = 1
): XYPoint[] => {
  const rand = mulberry32(seed);
  const out: XYPoint[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const y =
      amplitude * Math.sin((i / n) * Math.PI * 2 * freq) +
      (noise ? (rand() - 0.5) * noise : 0);
    out[i] = [i, y];
  }
  return out;
};

const makeStep = (n: number, stepAt: number, low = 0, high = 1): XYPoint[] => {
  const out: XYPoint[] = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = [i, i < stepAt ? low : high];
  }
  return out;
};

const makeSpikes = (
  n: number,
  spikes: Array<{ at: number; value: number }>,
  base = 0
): XYPoint[] => {
  const out: XYPoint[] = new Array(n);
  for (let i = 0; i < n; i++) out[i] = [i, base];
  for (const s of spikes) out[s.at] = [s.at, s.value];
  return out;
};

/**
 * Deterministic “adversarial” waveform:
 * - slow trend
 * - periodic oscillation
 * - occasional huge outliers
 * - small noise
 */
const makeAdversarialSeries = (n: number, seed: number): XYPoint[] => {
  const rand = mulberry32(seed);
  const out: XYPoint[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const trend = i * 0.0001;
    const osc = Math.sin(i / 50) * 2 + Math.sin(i / 7) * 0.2;
    const noise = (rand() - 0.5) * 0.05;
    let y = trend + osc + noise;

    // Rare outliers (deterministic)
    const r = rand();
    if (r > 0.999) y += 50;
    if (r < 0.001) y -= 50;

    out[i] = [i, y];
  }
  return out;
};

// ─────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────

describe('LTTB — stress suite', () => {
  // ═══════════════════════════════════════════════════════════════════
  // 1) Edge cases and contract
  // ═══════════════════════════════════════════════════════════════════

  describe('Contract / Edge cases', () => {
    it('empty input -> [] for any threshold', () => {
      expect(lttb([], 0)).toEqual([]);
      expect(lttb([], 10)).toEqual([]);
      expect(lttb([], -10)).toEqual([]);
    });

    it('threshold <= 0 -> []', () => {
      const data: XYPoint[] = [
        [0, 0],
        [1, 1],
      ];
      expect(lttb(data, 0)).toEqual([]);
      expect(lttb(data, -1)).toEqual([]);
    });

    it('threshold >= n -> returns a copy (not the same reference)', () => {
      const data: XYPoint[] = [
        [0, 0],
        [1, 1],
        [2, 2],
      ];
      const result = lttb(data, 999);
      expect(result).toEqual(data);
      expect(result).not.toBe(data);
    });

    it('threshold=1 -> [first], threshold=2 -> [first,last]', () => {
      const data: XYPoint[] = [
        [0, 10],
        [1, 20],
        [2, 30],
        [3, 40],
      ];
      expect(lttb(data, 1)).toEqual([[0, 10]]);
      expect(lttb(data, 2)).toEqual([
        [0, 10],
        [3, 40],
      ]);
    });

    it('never returns undefined points (exact length for threshold < n)', () => {
      const data = makeSine(1000, 1, 3, 0.1, 123);
      for (const t of [3, 10, 50, 999]) {
        const r = lttb(data, t);
        expect(r.length).toBe(t);
        // ensure no holes
        for (let i = 0; i < r.length; i++) {
          expect(r[i]).toBeTruthy();
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 2) Core invariants (the “purity” checks)
  // ═══════════════════════════════════════════════════════════════════

  describe('Core invariants', () => {
    it('always includes first and last (when threshold >= 2)', () => {
      const data = makeAdversarialSeries(5000, 7);

      const r2 = lttb(data, 2);
      expect(r2[0]).toEqual(data[0]);
      expect(r2[1]).toEqual(data[data.length - 1]);

      const r50 = lttb(data, 50);
      expect(r50[0]).toEqual(data[0]);
      expect(r50[r50.length - 1]).toEqual(data[data.length - 1]);
    });

    it('output X is strictly increasing', () => {
      const data = makeAdversarialSeries(10000, 42);
      const r = lttb(data, 500);
      assertMonotonicIncreasingX(r);
    });

    it('all output points exist in original data (no fabricated points)', () => {
      const data = makeAdversarialSeries(2000, 99);
      const r = lttb(data, 200);
      assertAllPointsFromOriginal(data, r);
    });

    it('does not mutate input', () => {
      const data = makeSine(2000, 1, 5, 0.2, 999);
      const snapshot = data.map(([x, y]) => [x, y] as XYPoint);
      lttb(data, 200);
      expect(data).toEqual(snapshot);
    });

    it('outputs finite numbers when inputs are finite', () => {
      const data = makeAdversarialSeries(3000, 1234);
      const r = lttb(data, 300);
      assertFinitePoints(r);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 3) Position tracking correctness (must match lttb)
  // ═══════════════════════════════════════════════════════════════════

  describe('lttbWithPositions correctness', () => {
    it('positions map back to points and are strictly increasing', () => {
      const data = makeAdversarialSeries(4000, 55);
      const threshold = 250;

      const { points, positions } = lttbWithPositions(data, threshold);

      expect(points.length).toBe(threshold);
      expect(positions.length).toBe(threshold);

      // positions must map back
      for (let i = 0; i < threshold; i++) {
        expect(points[i]).toEqual(data[positions[i]]);
      }

      // first/last
      expect(positions[0]).toBe(0);
      expect(positions[positions.length - 1]).toBe(data.length - 1);

      // strictly increasing indices
      assertStrictlyIncreasing(positions);

      // same output as lttb
      const plain = lttb(data, threshold);
      expect(points).toEqual(plain);
    });

    it('positions are within [0, n-1]', () => {
      const data = makeSine(1234, 1, 7, 0.05, 77);
      const { positions } = lttbWithPositions(data, 123);
      for (const p of positions) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThan(data.length);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 4) 1D API correctness (downsampleArray)
  // ═══════════════════════════════════════════════════════════════════

  describe('downsampleArray correctness', () => {
    it('indices map to original values and are strictly increasing', () => {
      const rand = mulberry32(2025);
      const n = 5000;
      const values = Array.from(
        { length: n },
        (_, i) => Math.sin(i / 20) + (rand() - 0.5) * 0.01
      );

      const threshold = 333;
      const { values: out, indices } = downsampleArray(values, threshold);

      expect(out.length).toBe(threshold);
      expect(indices.length).toBe(threshold);

      expect(indices[0]).toBe(0);
      expect(indices[indices.length - 1]).toBe(n - 1);

      assertStrictlyIncreasing(indices);

      for (let i = 0; i < threshold; i++) {
        expect(out[i]).toBe(values[indices[i]]);
      }
    });

    it('downsampleArray agrees with lttbWithPositions on equivalent XY data', () => {
      const n = 8000;
      const values = Array.from(
        { length: n },
        (_, i) => Math.sin(i / 30) * 10 + i * 0.0001
      );
      const xy: XYPoint[] = values.map((y, i) => [i, y]);

      const threshold = 500;

      const a = downsampleArray(values, threshold);
      const b = lttbWithPositions(xy, threshold);

      // indices must match exactly
      expect(a.indices).toEqual(b.positions);

      // values must match
      const fromXY = b.positions.map((idx) => values[idx]);
      expect(a.values).toEqual(fromXY);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 5) Pathological shapes (try to “fry” it)
  // ═══════════════════════════════════════════════════════════════════

  describe('Pathological shapes', () => {
    it('flat line: output still valid and ordered', () => {
      const n = 10000;
      const data: XYPoint[] = Array.from({ length: n }, (_, i) => [i, 7]);

      const r = lttb(data, 200);
      expect(r.length).toBe(200);
      expect(r[0]).toEqual(data[0]);
      expect(r[r.length - 1]).toEqual(data[n - 1]);
      assertMonotonicIncreasingX(r);
      assertAllPointsFromOriginal(data, r);
    });

    it('strictly increasing line: output still valid', () => {
      const n = 12000;
      const data: XYPoint[] = Array.from({ length: n }, (_, i) => [i, i]);

      const r = lttb(data, 300);
      expect(r.length).toBe(300);
      assertMonotonicIncreasingX(r);
      assertAllPointsFromOriginal(data, r);
    });

    it('single huge spike should be preserved when threshold is small but reasonable', () => {
      const data = makeSpikes(2000, [{ at: 1000, value: 1_000_000 }], 0);
      const r = lttb(data, 50);

      const hasSpike = r.some(([x, y]) => x === 1000 && y === 1_000_000);
      expect(hasSpike).toBe(true);
    });

    it('two spikes far apart: should preserve both at modest threshold', () => {
      const data = makeSpikes(
        5000,
        [
          { at: 1000, value: 9999 },
          { at: 4000, value: -9999 },
        ],
        0
      );

      const r = lttb(data, 80);

      const spikeA = r.some(([x, y]) => x === 1000 && y === 9999);
      const spikeB = r.some(([x, y]) => x === 4000 && y === -9999);

      expect(spikeA).toBe(true);
      expect(spikeB).toBe(true);
    });

    it('step function: should keep points around the step', () => {
      const data = makeStep(5000, 2500, 0, 100);
      const r = lttb(data, 100);

      // We can’t guarantee exact indices, but we expect the output to include
      // at least one point near the transition.
      const hasNearStep = r.some(([x]) => Math.abs(x - 2500) < 100);
      expect(hasNearStep).toBe(true);
    });

    it('high-frequency oscillation: should keep strong extremes', () => {
      const data = makeSine(10000, 1, 50, 0, 1); // lots of wiggles
      const r = lttb(data, 200);

      const maxY = r.reduce((m, p) => (p[1] > m ? p[1] : m), -Infinity);
      const minY = r.reduce((m, p) => (p[1] < m ? p[1] : m), Infinity);

      expect(maxY).toBeGreaterThan(0.9);
      expect(minY).toBeLessThan(-0.9);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 6) Fuzz / property tests (deterministic, many seeds)
  // ═══════════════════════════════════════════════════════════════════

  describe('Deterministic fuzz tests', () => {
    it('many random-ish series satisfy invariants', () => {
      const seeds = [1, 2, 3, 4, 5, 42, 99, 123, 999, 2025];
      const thresholds = [3, 10, 50, 100, 250];

      for (const seed of seeds) {
        const data = makeAdversarialSeries(5000, seed);

        for (const t of thresholds) {
          const r = lttb(data, t);

          expect(r.length).toBe(t);
          expect(r[0]).toEqual(data[0]);
          expect(r[r.length - 1]).toEqual(data[data.length - 1]);

          assertMonotonicIncreasingX(r);
          assertAllPointsFromOriginal(data, r);
          assertFinitePoints(r);
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 7) Performance sanity (non-flaky)
  // ═══════════════════════════════════════════════════════════════════

  describe('Performance sanity (non-flaky)', () => {
    it('handles 100k -> 1k with correct invariants', () => {
      const size = 100_000;
      const data = makeAdversarialSeries(size, 31415);

      const start = performance.now();
      const r = lttb(data, 1000);
      const end = performance.now();

      expect(r.length).toBe(1000);
      expect(r[0]).toEqual(data[0]);
      expect(r[r.length - 1]).toEqual(data[data.length - 1]);
      assertMonotonicIncreasingX(r);

      // Keep timing expectations out of CI to avoid flakes
      if (!process.env.CI) {
        expect(end - start).toBeLessThan(2500);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  TORTURE TESTS (The Purifier)
  // ═══════════════════════════════════════════════════════════════════

  describe(' EXTREME TORTURE - Numerical Stability', () => {
    it('handles extremely large Y values (near Number.MAX_VALUE)', () => {
      const scale = Number.MAX_VALUE / 10; // Don't overflow arithmetic
      const data: XYPoint[] = Array.from({ length: 1000 }, (_, i) => [
        i,
        Math.sin(i / 100) * scale,
      ]);

      const r = lttb(data, 100);

      expect(r.length).toBe(100);
      assertFinitePoints(r);
      assertMonotonicIncreasingX(r);
      expect(r[0]).toEqual(data[0]);
      expect(r[r.length - 1]).toEqual(data[data.length - 1]);
    });

    it('handles extremely small Y differences (floating-point precision)', () => {
      const base = 1e15; // Large base
      const epsilon = 1e-10; // Tiny variation
      const rand = mulberry32(777);

      const data: XYPoint[] = Array.from({ length: 5000 }, (_, i) => [
        i,
        base + (rand() - 0.5) * epsilon,
      ]);

      const r = lttb(data, 200);

      expect(r.length).toBe(200);
      assertFinitePoints(r);
      assertMonotonicIncreasingX(r);
      assertAllPointsFromOriginal(data, r);
    });

    it('handles mixed-scale data (tiny + huge values)', () => {
      const data: XYPoint[] = [];
      for (let i = 0; i < 2000; i++) {
        const y = i % 100 === 50 ? 1e10 : 1e-10; // Alternating scales
        data.push([i, y]);
      }

      const r = lttb(data, 150);

      expect(r.length).toBe(150);
      assertFinitePoints(r);
      assertMonotonicIncreasingX(r);

      // Should preserve some huge spikes
      const hasLargeValue = r.some(([_, y]) => y > 1e9);
      expect(hasLargeValue).toBe(true);
    });

    it('handles negative X coordinates (sorted)', () => {
      const data: XYPoint[] = Array.from({ length: 1000 }, (_, i) => [
        i - 500, // X ranges from -500 to 499
        Math.sin(i / 50),
      ]);

      const r = lttb(data, 100);

      expect(r.length).toBe(100);
      expect(r[0][0]).toBe(-500);
      expect(r[r.length - 1][0]).toBe(499);
      assertMonotonicIncreasingX(r);
    });

    it('handles Y values all negative', () => {
      const data: XYPoint[] = Array.from({ length: 1000 }, (_, i) => [
        i,
        -Math.abs(Math.sin(i / 50)) - 1000,
      ]);

      const r = lttb(data, 100);

      expect(r.length).toBe(100);
      assertMonotonicIncreasingX(r);
      assertAllPointsFromOriginal(data, r);

      // All Y should be negative
      for (const [_, y] of r) {
        expect(y).toBeLessThan(0);
      }
    });
  });

  describe(' EXTREME TORTURE - Degenerate Patterns', () => {
    it('sawtooth wave (maximum zigzag)', () => {
      const data: XYPoint[] = Array.from({ length: 10000 }, (_, i) => [
        i,
        i % 2 === 0 ? 0 : 100,
      ]);

      const r = lttb(data, 500);

      expect(r.length).toBe(500);
      assertMonotonicIncreasingX(r);

      // Should preserve mix of high/low
      const hasHigh = r.some(([_, y]) => y > 50);
      const hasLow = r.some(([_, y]) => y < 50);
      expect(hasHigh).toBe(true);
      expect(hasLow).toBe(true);
    });

    it('square wave (sharp transitions)', () => {
      const data: XYPoint[] = [];
      for (let i = 0; i < 8000; i++) {
        const y = Math.floor(i / 1000) % 2 === 0 ? -50 : 50;
        data.push([i, y]);
      }

      const r = lttb(data, 200);

      expect(r.length).toBe(200);
      assertMonotonicIncreasingX(r);

      // Should have both extremes
      const hasPositive = r.some(([_, y]) => y > 0);
      const hasNegative = r.some(([_, y]) => y < 0);
      expect(hasPositive).toBe(true);
      expect(hasNegative).toBe(true);
    });

    it('random walk (cumulative random)', () => {
      const rand = mulberry32(9999);
      let y = 0;
      const data: XYPoint[] = [];

      for (let i = 0; i < 5000; i++) {
        y += (rand() - 0.5) * 2; // Random step
        data.push([i, y]);
      }

      const r = lttb(data, 250);

      expect(r.length).toBe(250);
      assertMonotonicIncreasingX(r);
      assertAllPointsFromOriginal(data, r);
    });

    it('exponential growth (Y grows exponentially)', () => {
      const data: XYPoint[] = Array.from({ length: 1000 }, (_, i) => [
        i,
        Math.exp(i / 200), // Grows exponentially
      ]);

      const r = lttb(data, 100);

      expect(r.length).toBe(100);
      assertFinitePoints(r); // Should not overflow to Infinity
      assertMonotonicIncreasingX(r);
    });

    it('all zeros except first and last', () => {
      const data: XYPoint[] = Array.from({ length: 1000 }, (_, i) => [i, 0]);
      data[0] = [0, 100];
      data[999] = [999, 100];

      const r = lttb(data, 50);

      expect(r.length).toBe(50);
      expect(r[0]).toEqual([0, 100]);
      expect(r[r.length - 1]).toEqual([999, 100]);
    });
  });

  describe('EXTREME TORTURE - Boundary Conditions', () => {
    it('threshold = data.length - 1 (almost no downsampling)', () => {
      const data = makeSine(100, 1, 3, 0.1, 555);
      const r = lttb(data, 99);

      expect(r.length).toBe(99);
      expect(r[0]).toEqual(data[0]);
      expect(r[r.length - 1]).toEqual(data[data.length - 1]);
      assertMonotonicIncreasingX(r);
    });

    it('threshold = 3 (minimum meaningful)', () => {
      const data = makeAdversarialSeries(10000, 1111);
      const r = lttb(data, 3);

      expect(r.length).toBe(3);
      expect(r[0]).toEqual(data[0]);
      expect(r[2]).toEqual(data[data.length - 1]);
      assertMonotonicIncreasingX(r);

      // Middle point should be from the data
      assertAllPointsFromOriginal(data, r);
    });

    it('data.length = threshold + 1 (minimal reduction)', () => {
      const data = makeSine(101, 1, 5, 0.05, 321);
      const r = lttb(data, 100);

      expect(r.length).toBe(100);
      expect(r[0]).toEqual(data[0]);
      expect(r[r.length - 1]).toEqual(data[100]);
    });
  });

  describe('EXTREME TORTURE - Position Validation', () => {
    it('positions never duplicate (strictly increasing always)', () => {
      const seeds = [1, 42, 99, 777, 2025, 31415];
      const sizes = [100, 1000, 10000, 50000];

      for (const seed of seeds) {
        for (const size of sizes) {
          const data = makeAdversarialSeries(size, seed);
          const threshold = Math.floor(size / 10);

          const { positions } = lttbWithPositions(data, threshold);

          // Check strictly increasing (no duplicates, no going backwards)
          assertStrictlyIncreasing(positions);

          // Check all within bounds
          for (const p of positions) {
            expect(p).toBeGreaterThanOrEqual(0);
            expect(p).toBeLessThan(size);
          }
        }
      }
    });

    it('positions are valid indices for extreme thresholds', () => {
      const data = makeAdversarialSeries(100000, 8888);

      for (const threshold of [3, 10, 100, 1000, 10000, 99999]) {
        const { positions } = lttbWithPositions(data, threshold);

        expect(positions.length).toBe(threshold);

        // All positions must be valid array indices
        for (const p of positions) {
          expect(Number.isInteger(p)).toBe(true);
          expect(p).toBeGreaterThanOrEqual(0);
          expect(p).toBeLessThan(data.length);
        }
      }
    });
  });

  describe('EXTREME TORTURE - Cross-Validation Matrix', () => {
    it('all APIs agree on positions/values for diverse inputs', () => {
      const testCases = [
        { n: 1000, threshold: 50, seed: 1 },
        { n: 5000, threshold: 200, seed: 42 },
        { n: 10000, threshold: 500, seed: 999 },
        { n: 50000, threshold: 1000, seed: 2025 },
      ];

      for (const tc of testCases) {
        const data = makeAdversarialSeries(tc.n, tc.seed);
        const values = data.map((p) => p[1]);

        // Get results from all 3 APIs
        const r1 = lttb(data, tc.threshold);
        const r2 = lttbWithPositions(data, tc.threshold);
        const r3 = downsampleArray(values, tc.threshold);

        // lttb and lttbWithPositions must agree
        expect(r1).toEqual(r2.points);

        // downsampleArray indices must match lttbWithPositions
        expect(r3.indices).toEqual(r2.positions);

        // downsampleArray values must match original at those positions
        for (let i = 0; i < r3.indices.length; i++) {
          expect(r3.values[i]).toBe(values[r3.indices[i]]);
        }
      }
    });
  });

  describe('EXTREME TORTURE - Memory & Allocation Stress', () => {
    it('repeated calls with same data are consistent (no state leaks)', () => {
      const data = makeAdversarialSeries(10000, 7777);

      const results = [];
      for (let i = 0; i < 100; i++) {
        results.push(lttb(data, 500));
      }

      // All results must be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(results[0]);
      }
    });

    it('multiple thresholds on same data maintain invariants', () => {
      const data = makeAdversarialSeries(20000, 55555);
      const thresholds = [10, 50, 100, 500, 1000, 5000, 10000];

      const results = thresholds.map((t) => lttb(data, t));

      // All must satisfy invariants
      for (let i = 0; i < results.length; i++) {
        expect(results[i].length).toBe(thresholds[i]);
        assertMonotonicIncreasingX(results[i]);
        assertAllPointsFromOriginal(data, results[i]);
      }
    });
  });

  describe('EXTREME TORTURE - Real-World Chaos', () => {
    it('ECG-like signal (medical device)', () => {
      // Simulates heart rate variability + noise
      const rand = mulberry32(12345);
      const data: XYPoint[] = [];

      for (let i = 0; i < 50000; i++) {
        const heartbeat = i % 100 < 5 ? 1.5 : 0; // Sharp QRS spikes
        const baseline = Math.sin(i / 500) * 0.1; // Breathing
        const noise = (rand() - 0.5) * 0.05; // Electrical noise
        data.push([i, heartbeat + baseline + noise]);
      }

      const r = lttb(data, 1000);

      expect(r.length).toBe(1000);
      assertMonotonicIncreasingX(r);

      // Must preserve QRS spikes (the tall narrow peaks)
      const hasSpike = r.some(([_, y]) => y > 1.0);
      expect(hasSpike).toBe(true);
    });

    it('stock market crash (sudden drop + recovery)', () => {
      const data: XYPoint[] = [];
      let price = 100;

      for (let i = 0; i < 10000; i++) {
        if (i === 5000) price *= 0.5; // Flash crash!
        if (i > 5000) price *= 1.0001; // Slow recovery

        data.push([i, price]);
      }

      const r = lttb(data, 500);

      expect(r.length).toBe(500);
      assertMonotonicIncreasingX(r);

      // Must capture the crash point
      const minY = r.reduce((min, [_, y]) => Math.min(min, y), Infinity);
      expect(minY).toBeLessThan(60); // Should show the drop
    });

    it('temperature sensor with occasional glitches', () => {
      const rand = mulberry32(99999);
      const data: XYPoint[] = [];

      for (let i = 0; i < 20000; i++) {
        const normal = 20 + Math.sin(i / 1000) * 5; // Daily variation
        const glitch = rand() > 0.999 ? 100 : 0; // Rare sensor error
        data.push([i, normal + glitch]);
      }

      const r = lttb(data, 800);

      expect(r.length).toBe(800);
      assertFinitePoints(r);

      // Should preserve at least some glitches
      const hasGlitch = r.some(([_, y]) => y > 50);
      expect(hasGlitch).toBe(true);
    });
  });
});
