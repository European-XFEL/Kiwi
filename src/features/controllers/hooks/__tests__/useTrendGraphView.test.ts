import { act, renderHook } from '@testing-library/react';
import { useTrendGraphView } from '../useTrendGraphView';

const START = new Date(2027, 2, 29, 0, 30).getTime();
const samples = (seconds: number) => [
  {
    key: 'A.value',
    timestamps: [START + seconds * 1000],
    values: [1],
  },
];

describe('useTrendGraphView', () => {
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(START));
  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['tenMinutes', new Date(2027, 2, 29, 0, 20).getTime()],
    ['hour', new Date(2027, 2, 28, 23, 30).getTime()],
    ['day', new Date(2027, 2, 28, 0, 30).getTime()],
    ['week', new Date(2027, 2, 22, 0, 30).getTime()],
  ] as const)(
    'follows wall-clock time for %s, using calendar days across DST',
    (mode, start) => {
      const { result, rerender } = renderHook(
        ({ seconds }) => useTrendGraphView(START, samples(seconds)),
        { initialProps: { seconds: 0 } }
      );
      act(() => result.current.follow(mode));
      expect(result.current.xRange).toEqual([start, START]);

      jest.spyOn(Date, 'now').mockReturnValue(START + 30_000);
      rerender({ seconds: 1 });
      expect(result.current.xRange).toEqual([start + 30_000, START + 30_000]);
    }
  );

  it('pauses on pan and reset resumes uptime', () => {
    const { result, rerender } = renderHook(
      ({ seconds }) => useTrendGraphView(START, samples(seconds)),
      { initialProps: { seconds: 10 } }
    );
    act(() => result.current.pause([START + 2000, START + 7000], [0, 2]));
    rerender({ seconds: 30 });
    expect(result.current.mode).toBeNull();
    expect(result.current.xRange).toEqual([START + 2000, START + 7000]);

    act(() => result.current.reset());
    expect(result.current.mode).toBe('uptime');
    expect(result.current.xRange).toEqual([START, START + 30_000]);
    expect(result.current.yRange).toBeUndefined();
  });
});
