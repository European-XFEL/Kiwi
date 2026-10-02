import { vectorPoints, generateDownsample, padViewportRange } from '../utils';

const x = Float64Array.from({ length: 201 }, (_, i) => 10 + i * 2);

test('clips only pairs longer than 200 and rounds the window outward', () => {
  expect(
    generateDownsample(new Float64Array(200), x, [31.9, 51.9])[0]
  ).toHaveLength(200);
  expect(generateDownsample(x, x)[0]).toHaveLength(201);
  const points = vectorPoints(generateDownsample(x, x, [31.9, 51.9]));
  expect(points).toHaveLength(12);
  expect(points[0]).toEqual({ x: 30, y: 30 });
  expect(points.at(-1)).toEqual({ x: 52, y: 52 });
});

test.each([
  [
    [-100, -10],
    [0, 0],
  ],
  [
    [500, 600],
    [0, 0],
  ],
  [
    [30, 30],
    [10, 11],
  ],
  [
    [-1, 1000],
    [0, 201],
  ],
  [
    [51.9, 31.9],
    [10, 22],
  ],
])('clamps and orders range %s', (range, expected) => {
  expect(generateDownsample(x, x, range as [number, number])[0]).toEqual(
    x.subarray(expected[0], expected[1])
  );
});

test('uses endpoint estimates for irregular, unordered, and descending X', () => {
  const irregular = Float64Array.from(x);
  irregular[10] = 1000;
  irregular[11] = -200;
  const sampled = generateDownsample(irregular, irregular, [30, 50]);
  expect(sampled[0][0]).toBe(1000);
  expect(sampled[0][1]).toBe(-200);
  expect(sampled[0].at(-1)).toBe(50);
  const descending = Float64Array.from(x).reverse();
  const reversed = generateDownsample(descending, descending, [30, 50]);
  expect(reversed[0][0]).toBe(50);
  expect(reversed[0].at(-1)).toBe(30);
});

test.each([0, NaN, Infinity])(
  'falls back to full pairs with spacing %s',
  (last) => {
    const degenerate = new Float64Array(201);
    degenerate[200] = last;
    expect(generateDownsample(degenerate, degenerate, [10, 20])[0]).toEqual(
      degenerate
    );
  }
);

test('falls back for non-finite indices', () => {
  expect(generateDownsample(x, x, [0, Infinity])[0]).toEqual(x);
});

test('separates logarithmic viewport padding from sampling original coordinates', () => {
  const source = Float64Array.from({ length: 1001 }, (_, i) => i + 1);
  const range: [number, number] = [10, 100];
  const sampled = generateDownsample(
    source,
    source,
    padViewportRange(range, true)
  );
  expect(sampled[0][0]).toBe(1);
  expect(sampled[0].at(-1)).toBe(1000);
  expect(sampled[0]).toHaveLength(1000);
  expect(range).toEqual([10, 100]);
});

test('constructs each view from complete source vectors without mutating or slicing them', () => {
  const sourceX = Float64Array.from({ length: 1001 }, (_, i) => i);
  const sourceY = Float64Array.from(sourceX, (value) => value * 2);
  const originalX = Float64Array.from(sourceX);
  const originalY = Float64Array.from(sourceY);
  const xSlice = jest.spyOn(sourceX, 'slice');
  const ySlice = jest.spyOn(sourceY, 'slice');

  const left = generateDownsample(sourceY, sourceX, [100, 200]);
  expect(left[0][0]).toBe(100);
  expect(left[0].at(-1)).toBe(200);
  const right = generateDownsample(sourceY, sourceX, [800, 900]);
  expect(right[0][0]).toBe(800);
  expect(right[0].at(-1)).toBe(900);
  expect(generateDownsample(sourceY, sourceX)).toEqual([originalX, originalY]);
  expect(Array.from(sourceX)).toEqual(Array.from(originalX));
  expect(Array.from(sourceY)).toEqual(Array.from(originalY));
  expect(xSlice).not.toHaveBeenCalled();
  expect(ySlice).not.toHaveBeenCalled();
  xSlice.mockRestore();
  ySlice.mockRestore();
});

test('uses the paired length and clipped window for adaptive sampling', () => {
  const sourceX = Float64Array.from({ length: 600_001 }, (_, i) => i);
  const sourceY = Float64Array.from({ length: 400_001 }, (_, i) => i * 2);
  const full = generateDownsample(sourceY, sourceX);
  expect(full[0]).toHaveLength(50_000);
  expect(full[0].at(-1)).toBe(400_000);
  const clipped = generateDownsample(sourceY, sourceX, [100_000, 350_001]);
  expect(clipped[0]).toHaveLength(30_000);
  expect(clipped[0][0]).toBe(100_000);
  expect(clipped[0].at(-1)).toBe(350_001);
  expect(clipped[1].at(-1)).toBe(700_002);
});
