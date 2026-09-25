import { lttb } from '../lttb';

describe('lttb', () => {
  it('preserves source indices when downsampling a nonzero viewport', () => {
    const values = Float64Array.from({ length: 100 }, (_, i) => Math.sin(i));
    const expected = lttb(values.subarray(30, 80), 10);
    for (let i = 0; i < expected.length; i += 2) expected[i] += 30;

    expect(lttb(values, 10, 30, 80)).toEqual(expected);
  });
  it('selects the peaks and endpoints of a vector', () => {
    expect(Array.from(lttb([0, 1, 8, 1, 0, -6, 0, 1, 7, 1, 0], 5))).toEqual([
      0, 0, 2, 8, 5, -6, 8, 7, 10, 0,
    ]);
  });

  it('preserves all points when the threshold is larger than the input', () => {
    expect(Array.from(lttb([1, 2, 3], 10))).toEqual([0, 1, 1, 2, 2, 3]);
  });

  it('samples a bounded view without copying the source values', () => {
    expect(Array.from(lttb([0, 1, 2, 3, 4, 5], 10, 2, 5))).toEqual([
      2, 2, 3, 3, 4, 4,
    ]);
  });
});
