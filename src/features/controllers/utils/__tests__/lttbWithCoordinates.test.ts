import { getSampleThreshold, lttbWithCoordinates } from '../lttb';

test('returns selected Chart.js points directly from a source window', () => {
  expect(
    lttbWithCoordinates({
      x: [-1, 0, 1, 2, 10, 11, 12, 100, 101, 102],
      y: [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8],
      start: 1,
      end: 9,
      threshold: 4,
    })
  ).toEqual([
    { x: 0, y: 0 },
    { x: 10, y: 3 },
    { x: 12, y: 5 },
    { x: 101, y: 7 },
  ]);
});

test('samples supplied baseline coordinates, including bounded windows', () => {
  const y = [3, 8, -2, 7, 12, 0, 4, 9];
  const x = [0, 1, 2, 3, 4, 5, 6, 7];
  expect(lttbWithCoordinates({ x, y, threshold: 4 })).toEqual([
    { x: 0, y: 3 },
    { x: 2, y: -2 },
    { x: 4, y: 12 },
    { x: 7, y: 9 },
  ]);
  expect(lttbWithCoordinates({ x, y, threshold: 4, start: 2, end: 7 })).toEqual(
    [
      { x: 2, y: -2 },
      { x: 3, y: 7 },
      { x: 4, y: 12 },
      { x: 6, y: 4 },
    ]
  );
  expect(lttbWithCoordinates({ x: [], y: [], threshold: 4 })).toEqual([]);
});

test('clips paired vectors before sampling without changing the inputs', () => {
  const x = Float64Array.from({ length: 100 }, (_, i) => 10 - i * 2);
  const y = Float32Array.from({ length: 100 }, (_, i) => Math.sin(i));
  const originalX = x.slice();
  const originalY = y.slice();
  const xWindow = jest.spyOn(x, 'subarray');
  const yWindow = jest.spyOn(y, 'subarray');
  const points = lttbWithCoordinates({
    y,
    x,
    threshold: 10,
    start: 30,
    end: 80,
  });
  expect(points).toHaveLength(10);
  expect(points[0]).toEqual({ x: x[30], y: y[30] });
  expect(points[9]).toEqual({ x: x[79], y: y[79] });
  expect(xWindow).toHaveBeenCalledWith(30, 80);
  expect(yWindow).toHaveBeenCalledWith(30, 80);
  xWindow.mockRestore();
  yWindow.mockRestore();
  expect(x).toEqual(originalX);
  expect(y).toEqual(originalY);
});

test.each([
  [2, 1, [], []],
  [10, 20, [], []],
  [1, 2, [20], [2]],
  [-2, 100, [10, 20], [1, 2]],
])('bounds the window [%s, %s) by the supplied vectors', (start, end, x, y) => {
  const points = lttbWithCoordinates({
    y: [1, 2],
    x: [10, 20],
    threshold: 4,
    start,
    end,
  });
  expect(points).toEqual(x.map((value, index) => ({ x: value, y: y[index] })));
});

test('uses supplied coordinates', () => {
  const x = new Float64Array([0, 1, 2, 10, 11, 12, 100, 101]);
  const y = new Float32Array([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(lttbWithCoordinates({ y, x, threshold: 4 })).toEqual([
    { x: 0, y: 0 },
    { x: 10, y: 3 },
    { x: 12, y: 5 },
    { x: 101, y: 7 },
  ]);
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
    const x = Float64Array.from({ length }, (_, index) => index);
    const points = lttbWithCoordinates({
      x,
      y: new Float64Array(length),
      threshold: expected,
    });
    expect(points).toHaveLength(expected);
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points.at(-1)).toEqual({ x: length - 1, y: 0 });
  }
);

test('uses the supplied threshold for a bounded visible window', () => {
  const y = new Float64Array(500_001).fill(100);
  y.fill(0, 100, 30_100);
  const points = lttbWithCoordinates({
    x: Float64Array.from({ length: y.length }, (_, index) => index),
    y,
    start: 100,
    end: 30_100,
    threshold: 20_000,
  });
  expect(points).toHaveLength(20_000);
  expect(points[0]).toEqual({ x: 100, y: 0 });
  expect(points.at(-1)).toEqual({ x: 30_099, y: 0 });
});

test.each([0, NaN, Infinity])(
  'honors explicit thresholds for values %s',
  (value) => {
    expect(
      lttbWithCoordinates({
        x: Float64Array.from({ length: 20 }, (_, index) => index),
        y: new Float64Array(20).fill(value),
        threshold: 20,
      })
    ).toHaveLength(20);
    expect(
      lttbWithCoordinates({
        x: Float64Array.from({ length: 100 }, (_, index) => index),
        y: new Float64Array(100).fill(value),
        threshold: 20,
      })
    ).toHaveLength(20);
  }
);
