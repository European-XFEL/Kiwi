import { TrendModel } from '../../trendmodel';

describe('TrendModel', () => {
  it('keeps incoming points unchanged until the display buffer fills', () => {
    const model = new TrendModel();

    for (let i = 0; i < 899; i++) model.addPoint(i, i * 2);

    const data = model.view();
    expect(data.timestamps).toHaveLength(899);
    expect(data.timestamps[0]).toBe(0);
    expect(data.timestamps[898]).toBe(898);
    expect(data.values[898]).toBe(1796);
  });

  it('rebuilds a full display buffer from coarse to fine generations', () => {
    const model = new TrendModel();

    for (let i = 0; i < 900; i++) model.addPoint(i, i);

    const data = model.view();
    expect(data.values).toHaveLength(261);
    expect(data.values.slice(0, 3)).toEqual([4.5, 14.5, 24.5]);
    expect(data.values[70]).toBe(704.5);
    expect(data.values[71]).toBe(710);
    expect(data.values[260]).toBe(899);
    expect(data.timestamps).toEqual(data.values);
  });

  it('keeps rendered data bounded during long runs', () => {
    const model = new TrendModel();

    for (let i = 0; i < 100_000; i++) model.addPoint(i, i);

    const data = model.view();
    expect(data.values.length).toBeLessThan(900);
    expect(data.values.at(-1)).toBe(99_999);
  });

  it('preserves averages and chronological order after repeated buffer wraps', () => {
    const model = new TrendModel();

    for (let i = 0; i < 1539; i++) model.addPoint(i, i * 2);

    // The second display rebuild keeps 134 ten-point averages and 199 raw points.
    const timestamps = [
      ...Array.from({ length: 134 }, (_, i) => i * 10 + 4.5),
      ...Array.from({ length: 199 }, (_, i) => 1340 + i),
    ];
    const data = model.view();
    expect(data.timestamps).toEqual(timestamps);
    expect(data.values).toEqual(timestamps.map((timestamp) => timestamp * 2));
  });

  it('reuses live arrays through appends and compaction without stale tail points', () => {
    const model = new TrendModel();
    const data = model.view();
    const { timestamps, values } = data;

    for (let i = 0; i < 899; i++) model.addPoint(i, i * 2);
    expect(values).toHaveLength(899);
    expect(values.at(-1)).toBe(1796);

    model.addPoint(899, 1798);
    expect(model.view()).toBe(data);
    expect(data.timestamps).toBe(timestamps);
    expect(data.values).toBe(values);
    expect(values).toHaveLength(261);
    expect(timestamps.at(-1)).toBe(899);
    expect(values.at(-1)).toBe(1798);

    for (let i = 900; i < 1_000_000; i++) model.addPoint(i, i * 2);
    expect(model.view().timestamps).toBe(timestamps);
    expect(model.view().values).toBe(values);
    expect(values.length).toBeLessThan(900);
    expect(timestamps.at(-1)).toBe(999_999);
    expect(values).toEqual(timestamps.map((timestamp) => timestamp * 2));
    expect(
      timestamps.every(
        (timestamp, i) => i === 0 || timestamp > timestamps[i - 1]
      )
    ).toBe(true);
  });
});
