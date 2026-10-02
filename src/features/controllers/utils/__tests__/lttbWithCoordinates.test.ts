import { lttb, lttbWithCoordinates } from '../lttb';

test('uses source indices when X is omitted, including bounded windows', () => {
  const y = [3, 8, -2, 7, 12, 0, 4, 9];
  const x = y.map((_, i) => i);
  expect(lttbWithCoordinates(y, undefined, { threshold: 4 })).toEqual(
    lttb(x, y, 4)
  );
  expect(
    lttbWithCoordinates(y, undefined, { threshold: 4, start: 2, end: 7 })
  ).toEqual(lttb(x, y, 4, 2, 7));
  expect(lttbWithCoordinates([])).toEqual([
    new Float64Array(),
    new Float64Array(),
  ]);
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
