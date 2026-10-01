import { lttb, lttbWithCoordinates } from '../lttb';

const values = [3, 8, -2, 7, 12, 0, 4, 9];

test('defaults to unchanged source coordinates', () => {
  expect(lttbWithCoordinates(values, 4)).toEqual(lttb(values, 4));
  expect(lttbWithCoordinates(values, 20, {})).toEqual(lttb(values, 20));
  expect(lttbWithCoordinates([], 4)).toEqual(new Float64Array());
});

test.each([2, -0.5, 0])(
  'transforms sampled X with step %s without changing order or Y',
  (step) => {
    const source = lttb(values, 4, 2, 7);
    const result = lttbWithCoordinates(values, 4, {
      start: 2,
      end: 7,
      offset: 10,
      step,
    });
    expect(result).toBeInstanceOf(Float64Array);
    expect(result.length).toBe(source.length);
    for (let index = 0; index < result.length; index += 2) {
      expect(result[index]).toBe(10 + source[index] * (step || 1));
      expect(result[index + 1]).toBe(source[index + 1]);
    }
  }
);

test('defaults coordinate options independently and preserves partial source indices', () => {
  expect(lttbWithCoordinates([4, 5, 6], 3, { offset: 10 })).toEqual(
    new Float64Array([10, 4, 11, 5, 12, 6])
  );
  expect(lttbWithCoordinates([4, 5, 6], 3, { start: 1, step: 2 })).toEqual(
    new Float64Array([2, 5, 4, 6])
  );
});
