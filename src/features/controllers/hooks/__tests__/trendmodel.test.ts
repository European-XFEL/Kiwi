import { TrendModel } from '../../trendmodel';

describe('TrendModel', () => {
  it('keeps incoming points unchanged until the display buffer fills', () => {
    const model = new TrendModel();

    for (let i = 0; i < 899; i++) model.addPoint(i, i * 2);

    const data = model.snapshot();
    expect(data.timestamps).toHaveLength(899);
    expect(data.timestamps[0]).toBe(0);
    expect(data.timestamps[898]).toBe(898);
    expect(data.values[898]).toBe(1796);
  });

  it('rebuilds a full display buffer from coarse to fine generations', () => {
    const model = new TrendModel();

    for (let i = 0; i < 900; i++) model.addPoint(i, i);

    const data = model.snapshot();
    expect(data.values).toHaveLength(261);
    expect(data.values.slice(0, 3)).toEqual(
      new Float64Array([4.5, 14.5, 24.5])
    );
    expect(data.values[70]).toBe(704.5);
    expect(data.values[71]).toBe(710);
    expect(data.values[260]).toBe(899);
    expect(data.timestamps).toEqual(data.values);
  });

  it('keeps rendered data bounded during long runs', () => {
    const model = new TrendModel();

    for (let i = 0; i < 100_000; i++) model.addPoint(i, i);

    const data = model.snapshot();
    expect(data.values.length).toBeLessThan(900);
    expect(data.values.at(-1)).toBe(99_999);
  });
});
