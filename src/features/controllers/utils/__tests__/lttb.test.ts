import { lttb } from '../lttb';

const arrays = (points: [Float64Array, Float64Array]) =>
  points.map((values) => Array.from(values));

test('matches KaraboGui selection for irregular X coordinates', () => {
  const x = [0, 1, 2, 10, 11, 12, 100, 101];
  const y = [0, 1, 2, 3, 4, 5, 6, 7];
  expect(arrays(lttb(x, y, 4))).toEqual([
    [0, 10, 12, 101],
    [0, 3, 5, 7],
  ]);
  expect(x).toEqual([0, 1, 2, 10, 11, 12, 100, 101]);
  expect(y).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
});

test.each([
  [0, [[], []]],
  [1, [[10], [1]]],
  [
    2,
    [
      [10, 40],
      [1, 4],
    ],
  ],
  [
    10,
    [
      [10, 20, 30, 40],
      [1, 2, 3, 4],
    ],
  ],
])('handles threshold %s', (threshold, expected) => {
  expect(arrays(lttb([10, 20, 30, 40], [1, 2, 3, 4], threshold))).toEqual(
    expected
  );
});

test.each([
  [
    [10, 20, 30],
    [1, 2],
  ],
  [
    [10, 20],
    [1, 2, 3],
  ],
])('bounds sampling by the shorter vector', (x, y) => {
  expect(arrays(lttb(x, y, 10))).toEqual([
    [10, 20],
    [1, 2],
  ]);
});

test('handles empty vectors', () => {
  expect(arrays(lttb([], [1], 4))).toEqual([[], []]);
  expect(arrays(lttb([1], [], 4))).toEqual([[], []]);
});

test('preserves non-finite entries without filtering', () => {
  expect(
    arrays(lttb([0, NaN, Infinity], [NaN, Infinity, -Infinity], 10))
  ).toEqual([
    [0, NaN, Infinity],
    [NaN, Infinity, -Infinity],
  ]);
  const [x, y] = lttb([0, 1, 2, 3, 4], [0, NaN, NaN, NaN, Infinity], 3);
  expect(Array.from(x)).toEqual([0, 1, 4]);
  expect(Array.from(y)).toEqual([0, NaN, Infinity]);
});
