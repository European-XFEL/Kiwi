import { StrictMode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { PropertyProxy } from '@/lib/binding/PropertyProxy';
import { ProxyStatus } from '@/lib/binding/api';
import { TrendModel } from '../../trendmodel';
import { useDisplayTrendGraph } from '../useDisplayTrendGraph';

const START = 1_800_000_000;
const originalRequestIdleCallback = window.requestIdleCallback;
const originalCancelIdleCallback = window.cancelIdleCallback;
const makeProxy = (
  key: string,
  value: unknown,
  seconds = START
): PropertyProxy =>
  ({
    key,
    root: { status: ProxyStatus.MONITORING },
    value,
    timestamp: { toTimestamp: () => seconds },
  }) as PropertyProxy;

function update(proxy: PropertyProxy, value: number, seconds: number) {
  Object.assign(proxy, { value, timestamp: { toTimestamp: () => seconds } });
}

function flushIdle() {
  act(() => jest.runOnlyPendingTimers());
}

describe('useDisplayTrendGraph', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.requestIdleCallback = jest.fn((callback: IdleRequestCallback) =>
      window.setTimeout(
        () => callback({ didTimeout: false, timeRemaining: () => 50 }),
        0
      )
    );
    window.cancelIdleCallback = jest.fn((id: number) =>
      window.clearTimeout(id)
    );
    jest.spyOn(Date, 'now').mockReturnValue(START * 1000);
  });
  afterEach(() => {
    cleanup();
    window.requestIdleCallback = originalRequestIdleCallback;
    window.cancelIdleCallback = originalCancelIdleCallback;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('coalesces updates across devices without losing intermediate samples', () => {
    const proxies = [makeProxy('A.value', 1), makeProxy('B.value', 2)];
    const keys = proxies.map((proxy) => proxy.key);
    const view = jest.spyOn(TrendModel.prototype, 'view');
    const { result, rerender } = renderHook(() =>
      useDisplayTrendGraph([...proxies], keys)
    );
    const initial = result.current.series;
    view.mockClear();

    update(proxies[0], 3, START + 1);
    rerender();
    update(proxies[1], 4, START + 1);
    rerender();
    update(proxies[0], 5, START + 2);
    rerender();

    expect(result.current.series).toBe(initial);
    expect(result.current.dataRevision).toBe(0);
    expect(view).not.toHaveBeenCalled();
    expect(window.requestIdleCallback).toHaveBeenCalledTimes(1);
    flushIdle();
    expect(
      result.current.series.map((item) => Array.from(item.values))
    ).toEqual([
      [1, 3, 5],
      [2, 4],
    ]);
    expect(view).toHaveBeenCalledTimes(2);
    expect(result.current.dataRevision).toBe(1);

    update(proxies[1], 6, START + 2);
    rerender();
    flushIdle();
    expect(result.current.series[1].values).toEqual([2, 4, 6]);
    expect(result.current.dataRevision).toBe(2);
    rerender();
    expect(result.current.dataRevision).toBe(2);
  });

  it('cancels a pending idle callback on unmount', () => {
    const proxy = makeProxy('A.value', 1);
    const { unmount } = renderHook(() =>
      useDisplayTrendGraph([proxy], [proxy.key])
    );
    expect(jest.getTimerCount()).toBe(1);
    unmount();
    expect(window.cancelIdleCallback).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('retains pending samples through Strict Mode effect replay', () => {
    const proxy = makeProxy('A.value', 1);
    const { result } = renderHook(
      () => useDisplayTrendGraph([proxy], [proxy.key]),
      {
        wrapper: StrictMode,
      }
    );
    expect(jest.getTimerCount()).toBe(1);
    flushIdle();
    expect(result.current.series[0].values).toEqual([1]);
  });

  it('only publishes changed curves and reuses their live arrays', () => {
    const view = jest.spyOn(TrendModel.prototype, 'view');
    const proxies = [makeProxy('A.value', 1), makeProxy('B.value', 2)];
    const keys = proxies.map((proxy) => proxy.key);
    const { result, rerender } = renderHook(() =>
      useDisplayTrendGraph([...proxies], keys)
    );
    flushIdle();
    const initial = result.current.series;
    view.mockClear();

    update(proxies[0], 3, START + 1);
    rerender();
    flushIdle();

    expect(view).toHaveBeenCalledTimes(1);
    expect(result.current.series[0].values).toEqual([1, 3]);
    expect(result.current.series[1]).toBe(initial[1]);
    expect(result.current.series[0].values).toBe(initial[0].values);
    expect(result.current.series[0].timestamps).toBe(initial[0].timestamps);

    const published = result.current.series;
    rerender();
    expect(jest.getTimerCount()).toBe(0);
    expect(result.current.series).toBe(published);
  });

  it('retains disconnected curves while other devices update, then resumes', () => {
    const proxies = [makeProxy('A.value', 1), makeProxy('B.value', 2)];
    const keys = proxies.map((proxy) => proxy.key);
    const { result, rerender } = renderHook(() =>
      useDisplayTrendGraph([...proxies], keys)
    );

    proxies[0].root.status = ProxyStatus.OFFLINE;
    update(proxies[1], 4, START + 1);
    rerender();
    flushIdle();
    expect(
      result.current.series.map((item) => Array.from(item.values))
    ).toEqual([[1], [2, 4]]);

    proxies[0].root.status = ProxyStatus.MONITORING;
    update(proxies[0], 5, START + 2);
    rerender();
    flushIdle();
    expect(result.current.series[0].values).toEqual([1, 5]);
  });

  it('waits for ordered proxies and retains samples when those proxies are recreated', () => {
    const keys = ['A.value', 'B.value'];
    const { result, rerender } = renderHook(
      ({ proxies }) => useDisplayTrendGraph(proxies, keys),
      { initialProps: { proxies: [] as PropertyProxy[] } }
    );
    expect(
      result.current.series.map((item) => [item.key, Array.from(item.values)])
    ).toEqual([
      ['A.value', []],
      ['B.value', []],
    ]);
    rerender({ proxies: [makeProxy('A.value', 1), makeProxy('B.value', 2)] });
    flushIdle();
    const published = result.current.series;
    rerender({ proxies: [] });
    expect(result.current.series).toBe(published);
    rerender({
      proxies: [
        makeProxy('A.value', 3, START + 1),
        makeProxy('B.value', 4, START + 1),
      ],
    });
    flushIdle();
    expect(
      result.current.series.map((item) => [item.key, Array.from(item.values)])
    ).toEqual([
      ['A.value', [1, 3]],
      ['B.value', [2, 4]],
    ]);
  });

  it('extends an initial old value to widget creation time like Python', () => {
    const proxy = makeProxy('A.value', 7, START - 60);
    const { result, rerender } = renderHook(() =>
      useDisplayTrendGraph([proxy], [proxy.key])
    );
    flushIdle();
    expect(result.current.series[0].timestamps).toEqual([
      (START - 60) * 1000,
      START * 1000,
    ]);
    expect(result.current.series[0].values).toEqual([7, 7]);
    update(proxy, 8, START - 30);
    rerender();
    flushIdle();
    expect(result.current.series[0].values).toEqual([7, 7]);
    update(proxy, 9, START + 1);
    rerender();
    flushIdle();
    expect(result.current.series[0].values).toEqual([7, 7, 9]);
  });

  it.each([
    [null, []],
    [undefined, []],
    [NaN, []],
    [Infinity, []],
    ['3', []],
    [false, [0]],
    [true, [1]],
    [0, [0]],
    [3n, [3]],
  ])(
    'handles numeric binding value %s without inventing zero samples',
    (value, expected) => {
      const proxy = makeProxy('A.value', value);
      const { result } = renderHook(() =>
        useDisplayTrendGraph([proxy], [proxy.key])
      );
      flushIdle();
      expect(Array.from(result.current.series[0].values)).toEqual(expected);
    }
  );
});
