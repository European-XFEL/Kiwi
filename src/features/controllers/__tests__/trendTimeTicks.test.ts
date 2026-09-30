import { trendTimeTicks } from '../graph/trendTimeTicks';

const utc = (date: string) => new Date(date).getTime();
const ticks = (start: string, end: string, width = 600) =>
  trendTimeTicks([utc(start), utc(end)], width);

describe('pyqtgraph style trend time ticks', () => {
  it('steps milliseconds and seconds at short ranges', () => {
    expect(
      ticks('2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.100Z').map(
        ([value]) => value - utc('2026-01-01T00:00:00.000Z')
      )
    ).toEqual([25, 50, 75, 100]);
    expect(
      ticks('2026-01-01T00:00:00Z', '2026-01-01T00:01:00Z').some(([, label]) =>
        label.includes(':')
      )
    ).toBe(true);
  });

  it('uses minute and hour steps for hourly and daily views', () => {
    const hourly = ticks('2026-01-01T00:00:00Z', '2026-01-01T01:00:00Z');
    expect(hourly.map(([value]) => value)).toContain(
      utc('2026-01-01T00:15:00Z')
    );
    expect(hourly.map(([value]) => value)).not.toContain(
      utc('2026-01-01T00:10:00Z')
    );
    const daily = ticks('2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z');
    const hours = daily.filter(([, label]) => label.includes(':'));
    expect(hours.length).toBeGreaterThanOrEqual(3);
    expect(
      hours.slice(1).map(([value], index) => value - hours[index][0])
    ).toEqual(Array(hours.length - 1).fill(6 * 60 * 60_000));
  });

  it('steps calendar months and years', () => {
    const monthly = ticks('2026-01-15T00:00:00Z', '2026-03-15T00:00:00Z');
    expect(monthly.map(([, label]) => label)).toContain('Feb');
    const yearly = ticks('2019-01-01T00:00:00Z', '2039-01-01T00:00:00Z', 400);
    expect(yearly.map(([, label]) => label)).toContain('2025');
    expect(yearly.map(([, label]) => label)).not.toContain('2026');
  });

  it('places local midnight ticks across daylight saving changes', () => {
    const range = ticks('2026-03-28T12:00:00Z', '2026-03-31T12:00:00Z', 800);
    const sunday = range.find(([, label]) => label === 'Sun 29');
    const monday = range.find(([, label]) => label === 'Mon 30');
    expect(sunday?.[0]).toBe(new Date(2026, 2, 29).getTime());
    expect(monday?.[0]).toBe(new Date(2026, 2, 30).getTime());
    expect(monday![0] - sunday![0]).toBe(
      new Date(2026, 2, 30).getTime() - new Date(2026, 2, 29).getTime()
    );
  });
});
