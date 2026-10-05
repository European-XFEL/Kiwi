import { getSampleThreshold, lttb, lttbWithCoordinates } from '../lttb';

test('uses source indices when X is omitted, including bounded windows', () => {
  const y = [3, 8, -2, 7, 12, 0, 4, 9];
  const x = y.map((_, i) => i);
  expect(lttbWithCoordinates(y, undefined, { threshold: 4 })).toEqual(
    lttb(x, y, 4)
  );
  expect(
    lttbWithCoordinates(y, undefined, { threshold: 4, start: 2, end: 7 })
  ).toEqual(lttb(x.slice(2, 7), y.slice(2, 7), 4));
  expect(lttbWithCoordinates([])).toEqual([
    new Float64Array(),
    new Float64Array(),
  ]);
});

test('clips paired vectors before sampling without changing the inputs', () => {
  const x = Float64Array.from({ length: 100 }, (_, i) => 10 - i * 2);
  const y = Float32Array.from({ length: 100 }, (_, i) => Math.sin(i));
  const originalX = x.slice();
  const originalY = y.slice();
  const points = lttbWithCoordinates(y, x, {
    threshold: 10,
    start: 30,
    end: 80,
  });
  expect(points).toEqual(lttb(x.subarray(30, 80), y.subarray(30, 80), 10));
  expect(points[0][0]).toBe(x[30]);
  expect(points[0][9]).toBe(x[79]);
  expect(points[1][0]).toBe(y[30]);
  expect(points[1][9]).toBe(y[79]);
  expect(x).toEqual(originalX);
  expect(y).toEqual(originalY);
});

test.each([
  [2, 1, [], []],
  [10, 20, [], []],
  [1, 2, [20], [2]],
  [-2, 100, [10, 20], [1, 2]],
])('bounds the window [%s, %s) by the shorter vector', (start, end, x, y) => {
  const points = lttbWithCoordinates([1, 2, 3], [10, 20], {
    threshold: 4,
    start,
    end,
  });
  expect(points.map((values) => Array.from(values))).toEqual([x, y]);
});

test('uses supplied coordinates and the shorter vector', () => {
  const x = new Float64Array([0, 1, 2, 10, 11, 12, 100, 101]);
  const y = new Float32Array([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  expect(lttbWithCoordinates(y, x, { threshold: 4 })).toEqual(lttb(x, y, 4));
});

test.each([
  [20_000, 20_000],
  [20_001, 20_000],
  [200_000, 20_000],
  [200_001, 30_000],
  [300_000, 30_000],
  [300_001, 40_000],
  [400_000, 40_000],
  [400_001, 50_000],
  [500_000, 50_000],
  [500_001, 60_000],
])(
  'selects the adaptive threshold for %s visible samples',
  (length, expected) => {
    expect(getSampleThreshold(length)).toBe(expected);
    const [x, y] = lttbWithCoordinates(new Float64Array(length));
    expect(x).toHaveLength(expected);
    expect(y).toHaveLength(expected);
    expect(x[0]).toBe(0);
    expect(x.at(-1)).toBe(length - 1);
  }
);

test('chooses thresholds from the bounded visible window', () => {
  const y = new Float64Array(500_001).fill(100);
  y.fill(0, 100, 30_100);
  const [x] = lttbWithCoordinates(y, undefined, {
    start: 100,
    end: 30_100,
  });
  expect(x).toHaveLength(20_000);
  expect(x[0]).toBe(100);
  expect(x.at(-1)).toBe(30_099);
});

test.each([0, NaN, Infinity])(
  'honors explicit thresholds for values %s',
  (value) => {
    expect(
      lttbWithCoordinates(new Float64Array(20).fill(value), undefined, {
        threshold: 20,
      })[0]
    ).toHaveLength(20);
    expect(
      lttbWithCoordinates(new Float64Array(100).fill(value), undefined, {
        threshold: 20,
      })[0]
    ).toHaveLength(20);
  }
);
