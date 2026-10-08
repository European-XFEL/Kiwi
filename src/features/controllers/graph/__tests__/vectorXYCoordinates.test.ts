import { getSamplingWindow, padViewportRange } from '../utils';

const x = Float64Array.from({ length: 201 }, (_, i) => 10 + i * 2);

test('clips only vectors longer than 200 and rounds the window outward', () => {
  expect(
    getSamplingWindow({ x: x.subarray(0, 200), range: [31.9, 51.9] })
  ).toEqual({ start: 0, end: 200 });
  expect(getSamplingWindow({ x })).toEqual({ start: 0, end: 201 });
  expect(getSamplingWindow({ x, range: [31.9, 51.9] })).toEqual({
    start: 10,
    end: 22,
  });
  expect(getSamplingWindow({ x: [] })).toEqual({ start: 0, end: 0 });
});

test.each([
  { range: [-100, -10], start: 0, end: 0 },
  { range: [500, 600], start: 0, end: 0 },
  { range: [30, 30], start: 10, end: 11 },
  { range: [-1, 1000], start: 0, end: 201 },
  { range: [51.9, 31.9], start: 10, end: 22 },
])('clamps and orders range $range', ({ range, start, end }) => {
  expect(getSamplingWindow({ x, range: range as [number, number] })).toEqual({
    start,
    end,
  });
});

test('uses endpoint estimates for irregular, unordered, and descending X', () => {
  const irregular = Float64Array.from(x);
  irregular[10] = 1000;
  irregular[11] = -200;
  expect(getSamplingWindow({ x: irregular, range: [30, 50] })).toEqual({
    start: 10,
    end: 21,
  });
  const descending = Float64Array.from(x).reverse();
  expect(getSamplingWindow({ x: descending, range: [30, 50] })).toEqual({
    start: 180,
    end: 191,
  });
});

test.each([0, NaN, Infinity])(
  'falls back to full vectors with spacing %s',
  (last) => {
    const degenerate = new Float64Array(201);
    degenerate[200] = last;
    expect(getSamplingWindow({ x: degenerate, range: [10, 20] })).toEqual({
      start: 0,
      end: 201,
    });
  }
);

test('falls back for non-finite indices', () => {
  expect(getSamplingWindow({ x, range: [0, Infinity] })).toEqual({
    start: 0,
    end: 201,
  });
});

test('separates logarithmic viewport padding from original coordinates', () => {
  const source = Float64Array.from({ length: 1001 }, (_, i) => i + 1);
  const range: [number, number] = [10, 100];
  expect(
    getSamplingWindow({ x: source, range: padViewportRange(range, true) })
  ).toEqual({ start: 0, end: 1000 });
  expect(range).toEqual([10, 100]);
});

test('constructs each window from complete source coordinates without changing them', () => {
  const source = Float64Array.from({ length: 1001 }, (_, i) => i);
  const original = Float64Array.from(source);
  expect(getSamplingWindow({ x: source, range: [100, 200] })).toEqual({
    start: 100,
    end: 201,
  });
  expect(getSamplingWindow({ x: source, range: [800, 900] })).toEqual({
    start: 800,
    end: 901,
  });
  expect(getSamplingWindow({ x: source })).toEqual({ start: 0, end: 1001 });
  expect(source).toEqual(original);
});
