import { DisplayTrendGraphModel, buildModelConfig } from '@/karabo/common/api';
import { act, renderHook } from '@testing-library/react';

import { useTrendChart } from '../useTrendChart';

const START = new Date(2027, 2, 29, 0, 30).getTime();
const samples = (seconds: number) => [
  {
    key: 'A.value',
    timestamps: [START + seconds * 1000],
    values: [1],
  },
];

const model = buildModelConfig(new DisplayTrendGraphModel());

const useView = (seconds: number) =>
  useTrendChart({
    plotConfig: model,
    series: samples(seconds),
    startTime: START,
    dataRevision: seconds,
  });

describe('useTrendChart view state', () => {
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(START));
  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['', 64],
    ['Value', 80],
  ])(
    'uses the fixed numeric gutter for title %s in the surrounding layout',
    (label, width) => {
      const plotConfig = buildModelConfig(new DisplayTrendGraphModel());
      plotConfig.y_label = label;
      const { result } = renderHook(() =>
        useTrendChart({
          plotConfig,
          series: samples(10),
          startTime: START,
          dataRevision: 0,
        })
      );
      expect(result.current.yAxisWidth).toBe(width);
    }
  );

  it.each([
    ['tenMinutes', new Date(2027, 2, 29, 0, 20).getTime()],
    ['hour', new Date(2027, 2, 28, 23, 30).getTime()],
    ['day', new Date(2027, 2, 28, 0, 30).getTime()],
    ['week', new Date(2027, 2, 22, 0, 30).getTime()],
  ] as const)(
    'follows wall-clock time for %s, using calendar days across DST',
    (mode, start) => {
      const { result, rerender } = renderHook(
        ({ seconds }) => useView(seconds),
        { initialProps: { seconds: 0 } }
      );
      act(() => result.current.follow(mode));
      expect(result.current.xRange).toEqual([start, START]);

      jest.spyOn(Date, 'now').mockReturnValue(START + 30_000);
      rerender({ seconds: 1 });
      expect(result.current.xRange).toEqual([start + 30_000, START + 30_000]);
    }
  );

  it('pauses on pan and Reset retains the displayed interval', () => {
    const { result, rerender } = renderHook(({ seconds }) => useView(seconds), {
      initialProps: { seconds: 10 },
    });
    act(() => result.current.pause([START + 2000, START + 7000], [0, 2]));
    rerender({ seconds: 30 });
    expect(result.current.mode).toBeNull();
    expect(result.current.xRange).toEqual([START + 2000, START + 7000]);

    act(() => result.current.reloadHistory());
    expect(result.current.mode).toBeNull();
    expect(result.current.xRange).toEqual([START + 2000, START + 7000]);
    expect(result.current.yRange).toEqual([0, 2]);
    act(() => result.current.follow('uptime'));
    expect(result.current.xRange).toEqual([START, START + 30_000]);
  });
});

describe('history navigation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Date, 'now').mockReturnValue(START);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('requests presets immediately and debounces completed navigation', () => {
    const requestHistory = jest.fn();
    const { result, rerender, unmount } = renderHook(
      ({ revision }) =>
        useTrendChart({
          plotConfig: model,
          series: samples(revision),
          startTime: START,
          dataRevision: revision,
          requestHistory,
        }),
      { initialProps: { revision: 0 } }
    );
    expect(requestHistory).not.toHaveBeenCalled();
    act(() => result.current.follow('hour'));
    expect(requestHistory).toHaveBeenLastCalledWith([START - 3600000, START]);
    rerender({ revision: 1 });
    expect(requestHistory).toHaveBeenCalledTimes(1);
    act(() => result.current.pause([10, 20]));
    act(() => jest.advanceTimersByTime(900));
    act(() => result.current.pause([30, 40]));
    act(() => jest.advanceTimersByTime(999));
    expect(requestHistory).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(1));
    expect(requestHistory).toHaveBeenLastCalledWith([30, 40]);
    act(() => result.current.toggleCurve('A.value'));
    act(() => result.current.pause([40, 50]));
    act(() => jest.advanceTimersByTime(1000));
    expect(requestHistory).toHaveBeenCalledTimes(3);
    act(() => result.current.toggleCurve('A.value'));
    expect(requestHistory).toHaveBeenCalledTimes(3);
    expect(requestHistory).toHaveBeenLastCalledWith([40, 50]);
    act(() => result.current.pause([50, 60]));
    act(() => result.current.follow('uptime'));
    act(() => jest.advanceTimersByTime(1000));
    expect(requestHistory).toHaveBeenCalledTimes(3);
    act(() => result.current.pause([60, 70]));
    act(() => result.current.reloadHistory());
    act(() => jest.advanceTimersByTime(1000));
    expect(requestHistory).toHaveBeenCalledTimes(3);
    act(() => result.current.pause([70, 80]));
    unmount();
    act(() => jest.advanceTimersByTime(1000));
    expect(requestHistory).toHaveBeenCalledTimes(3);
  });
});

it('hiding and revealing never request history, while presets include hidden curves', () => {
  let now = START;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  const requestHistory = jest.fn();
  const { result, rerender, unmount } = renderHook(
    ({ revision }) =>
      useTrendChart({
        plotConfig: model,
        series: samples(revision),
        startTime: START,
        dataRevision: revision,
        requestHistory,
      }),
    { initialProps: { revision: 0 } }
  );
  act(() => result.current.toggleCurve('A.value'));
  act(() => result.current.follow('hour'));
  expect(requestHistory).toHaveBeenCalledWith([START - 3_600_000, START]);
  requestHistory.mockClear();
  now += 30_000;
  rerender({ revision: 1 });
  act(() => result.current.toggleCurve('A.value'));
  expect(requestHistory).not.toHaveBeenCalled();
  unmount();
  jest.restoreAllMocks();
});

it('does not request history for Y-only navigation when published data has advanced past the displayed range', () => {
  jest.useFakeTimers();
  const requestHistory = jest.fn();
  const { result, unmount } = renderHook(() =>
    useTrendChart({
      plotConfig: model,
      series: samples(30),
      startTime: START,
      dataRevision: 1,
      requestHistory,
    })
  );
  // During an active gesture, useChart defers new data and retains this range.
  act(() => {
    result.current.rememberRange([START, START + 1000]);
    result.current.pause([START, START + 1000], [0, 5]);
  });
  act(() => jest.advanceTimersByTime(1000));
  expect(requestHistory).not.toHaveBeenCalled();
  unmount();
  jest.useRealTimers();
});

it('cancels a pending navigation request when curve/category identity changes', () => {
  jest.useFakeTimers();
  const requestHistory = jest.fn();
  const { result, rerender, unmount } = renderHook(
    ({ key, mode }) =>
      useTrendChart({
        plotConfig: model,
        series: [{ key, timestamps: [START], values: [1] }],
        startTime: START,
        dataRevision: 0,
        mode,
        requestHistory,
      }),
    { initialProps: { key: 'A.value', mode: 'numeric' as 'numeric' | 'state' } }
  );
  act(() => result.current.pause([10, 20]));
  rerender({ key: 'B.value', mode: 'state' });
  act(() => jest.advanceTimersByTime(1000));
  expect(requestHistory).not.toHaveBeenCalled();
  unmount();
  jest.useRealTimers();
});

it.each(['uptime', 'hour', 'manual', 'empty'] as const)(
  'Reset freezes the displayed %s interval and cancels older navigation',
  (preset) => {
    jest.useFakeTimers();
    jest.spyOn(Date, 'now').mockReturnValue(START);
    const requestHistory = jest.fn();
    const resetHistory = jest.fn();
    const { result, rerender, unmount } = renderHook(
      ({ empty }) =>
        useTrendChart({
          plotConfig: model,
          series: empty
            ? [{ key: 'A.value', timestamps: [], values: [] }]
            : samples(30),
          startTime: START,
          dataRevision: 1,
          requestHistory,
          resetHistory,
        }),
      { initialProps: { empty: preset === 'empty' } }
    );
    if (preset === 'hour') {
      act(() => result.current.follow('hour'));
    }
    if (preset === 'manual') {
      act(() => result.current.pause([10, 20], [-5, 5]));
    }
    const range =
      preset === 'hour'
        ? [START - 3600000, START]
        : preset === 'manual'
          ? [10, 20]
          : [START, START + (preset === 'empty' ? 1000 : 30000)];
    // Snapshot the rendered interval even if following data has since advanced.
    act(() => result.current.rememberRange(range as [number, number]));
    requestHistory.mockClear();
    act(() => result.current.reloadHistory());
    rerender({ empty: true });
    expect(result.current.mode).toBeNull();
    expect(result.current.xRange).toEqual(range);
    expect(result.current.yRange).toEqual(
      preset === 'manual' ? [-5, 5] : [0, 1]
    );
    expect(resetHistory).toHaveBeenLastCalledWith(range);
    act(() => result.current.reloadHistory());
    expect(resetHistory).toHaveBeenCalledTimes(2);
    act(() => jest.advanceTimersByTime(1000));
    expect(requestHistory).not.toHaveBeenCalled();
    unmount();
    jest.useRealTimers();
    jest.restoreAllMocks();
  }
);
