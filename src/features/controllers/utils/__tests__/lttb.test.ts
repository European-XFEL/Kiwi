import { lttb } from '../lttb';

test('matches KaraboGui selection for irregular X coordinates', () => {
  const x = [0, 1, 2, 10, 11, 12, 100, 101];
  const y = [0, 1, 2, 3, 4, 5, 6, 7];
  expect(lttb({ x, y, threshold: 4 })).toEqual([
    { x: 0, y: 0 },
    { x: 10, y: 3 },
    { x: 12, y: 5 },
    { x: 101, y: 7 },
  ]);
  expect(x).toEqual([0, 1, 2, 10, 11, 12, 100, 101]);
  expect(y).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
});

test.each([
  [0, []],
  [1, [{ x: 10, y: 1 }]],
  [
    2,
    [
      { x: 10, y: 1 },
      { x: 40, y: 4 },
    ],
  ],
  [
    10,
    [
      { x: 10, y: 1 },
      { x: 20, y: 2 },
      { x: 30, y: 3 },
      { x: 40, y: 4 },
    ],
  ],
])('handles threshold %s', (threshold, expected) => {
  expect(lttb({ x: [10, 20, 30, 40], y: [1, 2, 3, 4], threshold })).toEqual(
    expected
  );
});

test('handles empty vectors', () => {
  expect(lttb({ x: [], y: [], threshold: 4 })).toEqual([]);
});

test('preserves non-finite entries without filtering', () => {
  expect(
    lttb({
      x: [0, NaN, Infinity],
      y: [NaN, Infinity, -Infinity],
      threshold: 10,
    })
  ).toEqual([
    { x: 0, y: NaN },
    { x: NaN, y: Infinity },
    { x: Infinity, y: -Infinity },
  ]);
  expect(
    lttb({
      x: [0, 1, 2, 3, 4],
      y: [0, NaN, NaN, NaN, Infinity],
      threshold: 3,
    })
  ).toEqual([
    { x: 0, y: 0 },
    { x: 1, y: NaN },
    { x: 4, y: Infinity },
  ]);
});
