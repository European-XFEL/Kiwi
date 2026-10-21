import { StrictMode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import {
  DeviceProxy,
  PropertyProxy,
  DoubleBinding,
  StringBinding,
} from '@/lib/binding/api';
import { Hash, HashList, Timestamp } from '@/karabo/data/api';
import { useTrendModel } from '../useTrendModel';

const sample = (value: unknown, seconds: number) => {
  const hash = new Hash('v', value);
  new Timestamp(seconds).toHashAttributes(hash);
  return hash;
};
const makeProxy = (categorical = false) => {
  const root = new DeviceProxy('A');
  root.binding.value!.set(
    'value',
    categorical ? new StringBinding() : new DoubleBinding()
  );
  const proxy = new PropertyProxy(root, 'value');
  jest.spyOn(proxy, 'getHistory').mockImplementation(() => {});
  return proxy;
};

describe('trend history delivery', () => {
  const requestIdle = window.requestIdleCallback;
  const cancelIdle = window.cancelIdleCallback;
  beforeEach(() => {
    jest.useFakeTimers();
    window.requestIdleCallback = (callback) =>
      window.setTimeout(
        () => callback({ didTimeout: false, timeRemaining: () => 50 }),
        0
      );
    window.cancelIdleCallback = (id) => window.clearTimeout(id);
  });
  afterEach(() => {
    cleanup();
    window.requestIdleCallback = requestIdle;
    window.cancelIdleCallback = cancelIdle;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('collects live updates across proxy array updates', () => {
    const proxy = makeProxy();
    const now = 1_800_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const { result, rerender, unmount } = renderHook(() =>
      useTrendModel([proxy], [proxy.key])
    );
    rerender();

    proxy.binding!.setValue(7, new Timestamp((now + 1000) / 1000));
    rerender();
    expect(result.current.dataRevision).toBe(0);
    act(() => jest.runOnlyPendingTimers());
    expect(result.current.series[0]).toMatchObject({
      timestamps: [now + 1000],
      values: [7],
    });
    expect(result.current.dataRevision).toBe(1);
    unmount();
    proxy.dispose();
  });

  it.each(['numeric', 'state', 'alarm'] as const)(
    'publishes %s history at idle and unsubscribes in Strict Mode',
    (mode) => {
      const first = makeProxy();
      const next = makeProxy();
      const { result, rerender, unmount } = renderHook(
        ({ proxy }) => useTrendModel([proxy], ['A.value'], mode),
        { initialProps: { proxy: first }, wrapper: StrictMode }
      );
      const value =
        mode === 'numeric' ? 3 : mode === 'state' ? 'ERROR' : 'interlock';
      act(() => result.current.requestHistory([0, 30000]));
      act(() =>
        first.historic_data.fire(
          new HashList([
            sample(value, 20),
            sample('invalid', 15),
            sample(value, 10),
          ])
        )
      );
      expect(result.current.dataRevision).toBe(0);
      act(() => jest.runOnlyPendingTimers());
      expect(result.current.series[0]).toMatchObject({
        timestamps: [10000, 20000],
        values: [3, 3],
      });
      expect(result.current.dataRevision).toBe(1);
      act(() => first.historic_data.fire(new HashList([sample('bad', 30)])));
      act(() => first.historic_data.fire(new HashList([])));
      expect(jest.getTimerCount()).toBe(0);
      rerender({ proxy: next });
      act(() => first.historic_data.fire(new HashList([sample(value, 30)])));
      expect(jest.getTimerCount()).toBe(0);
      act(() => result.current.requestHistory([30000, 50000]));
      expect(first.getHistory).toHaveBeenCalledTimes(1);
      expect(next.getHistory).toHaveBeenCalledTimes(1);
      expect(next.getHistory).toHaveBeenCalledWith({
        timeStart: '1970-01-01T00:00:30.000',
        timeEnd: '1970-01-01T00:00:50.000',
        maxValueCount: 500,
      });
      act(() => next.historic_data.fire(new HashList([sample(value, 40)])));
      act(() => jest.runOnlyPendingTimers());
      expect(result.current.series[0].timestamps).toEqual([40000]);
      unmount();
      act(() => next.historic_data.fire(new HashList([sample(value, 50)])));
      expect(jest.getTimerCount()).toBe(0);
      first.dispose();
      next.dispose();
    }
  );

  it.each(['numeric', 'state', 'alarm'] as const)(
    'Reset purges %s history and pending live publication, then accepts fresh data',
    (mode) => {
      const proxy = makeProxy(mode !== 'numeric');
      const value =
        mode === 'numeric' ? 3 : mode === 'state' ? 'ERROR' : 'interlock';
      const now = 1_800_000_000_000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      proxy.binding!.setValue(value, new Timestamp(now / 1000));
      const { result, rerender } = renderHook(() =>
        useTrendModel([proxy], [proxy.key], mode)
      );
      act(() => result.current.requestHistory([0, 30000]));
      act(() =>
        proxy.historic_data.fire(
          new HashList([sample(value, 10), sample(value, 20)])
        )
      );
      act(() => jest.runOnlyPendingTimers());
      expect(result.current.series[0].values).toEqual([3, 3, 3]);
      proxy.binding!.setValue(value, new Timestamp((now + 1000) / 1000));
      rerender();
      const startTime = result.current.startTime;
      const revision = result.current.dataRevision;
      act(() => result.current.resetHistory([0, 1000]));
      expect(proxy.getHistory).toHaveBeenLastCalledWith({
        timeStart: '1970-01-01T00:00:00.000',
        timeEnd: '1970-01-01T00:00:01.000',
        maxValueCount: 500,
      });
      act(() => jest.runOnlyPendingTimers());
      expect(result.current.series[0]).toMatchObject({
        timestamps: [],
        values: [],
      });
      expect(result.current.dataRevision).toBe(revision + 1);
      expect(result.current.startTime).toBe(startTime);
      rerender();
      act(() => jest.runOnlyPendingTimers());
      expect(result.current.series[0].values).toEqual([]);
      act(() => result.current.resetHistory([0, 1000]));
      act(() => proxy.historic_data.fire(new HashList([sample(value, 0.5)])));
      proxy.binding!.setValue(value, new Timestamp((now + 2000) / 1000));
      rerender();
      act(() => jest.runOnlyPendingTimers());
      expect(result.current.series[0].timestamps).toEqual([500, now + 2000]);
      expect(result.current.series[0].values).toEqual([3, 3]);
      act(() => result.current.resetHistory([NaN, 1000]));
      act(() => jest.runOnlyPendingTimers());
      expect(result.current.series[0].values).toEqual([3, 3]);
      proxy.dispose();
    }
  );

  it('requests all current curves with UTC timestamps and a 500 point limit', () => {
    const proxies = ['A', 'B', 'unmatched'].map((device) => {
      const root = new DeviceProxy(device);
      root.binding.value!.set('value', new DoubleBinding());
      const proxy = new PropertyProxy(root, 'value');
      jest.spyOn(proxy, 'getHistory').mockImplementation(() => {});
      return proxy;
    });
    const { result, unmount } = renderHook(() =>
      useTrendModel(proxies, ['A.value', 'B.value'])
    );
    act(() => result.current.requestHistory([NaN, 1000]));
    expect(
      proxies.every(
        (proxy) => jest.mocked(proxy.getHistory).mock.calls.length === 0
      )
    ).toBe(true);
    act(() => result.current.requestHistory([1000, 0]));
    for (const proxy of proxies.slice(0, 2)) {
      expect(proxy.getHistory).toHaveBeenCalledTimes(1);
      expect(proxy.getHistory).toHaveBeenCalledWith({
        timeStart: '1970-01-01T00:00:00.000',
        timeEnd: '1970-01-01T00:00:01.000',
        maxValueCount: 500,
      });
    }
    expect(proxies[2].getHistory).not.toHaveBeenCalled();
    unmount();
    proxies.forEach((proxy) => proxy.dispose());
  });
});

it('cleans up history listeners when keys and categories change', () => {
  const proxy = makeProxy();
  const { result, rerender, unmount } = renderHook(
    ({ keys, mode }) => useTrendModel([proxy], keys, mode),
    {
      initialProps: {
        keys: [proxy.key],
        mode: 'numeric' as 'numeric' | 'state',
      },
    }
  );
  rerender({ keys: ['B.value'], mode: 'state' });
  act(() => proxy.historic_data.fire(new HashList([sample('ERROR', 10)])));
  expect(result.current.series[0].values).toEqual([]);
  rerender({ keys: [proxy.key], mode: 'state' });
  act(() => result.current.requestHistory([0, 30000]));
  act(() =>
    proxy.historic_data.fire(new HashList([sample(3, 10), sample('ERROR', 20)]))
  );
  expect(result.current.series[0].values).toEqual([3]);
  unmount();
  proxy.dispose();
});

it('ignores history before an interval is selected and leaves revisions unchanged for rejected replies', () => {
  const proxy = makeProxy();
  const { result, unmount } = renderHook(() =>
    useTrendModel([proxy], [proxy.key])
  );
  act(() => proxy.historic_data.fire(new HashList([sample(2, 10)])));
  expect(result.current.dataRevision).toBe(0);
  act(() => result.current.requestHistory([0, 100000]));
  act(() =>
    proxy.historic_data.fire(
      new HashList([10, 20, 30, 40, 50].map((time) => sample(1, time)))
    )
  );
  expect(result.current.dataRevision).toBe(1);
  act(() =>
    proxy.historic_data.fire(new HashList([sample(2, 10), sample(2, 50)]))
  );
  expect(result.current.dataRevision).toBe(1);
  expect(result.current.series[0].values).toEqual([1, 1, 1, 1, 1]);
  act(() =>
    proxy.historic_data.fire(new HashList([sample(2, 0), sample(2, 99)]))
  );
  expect(result.current.dataRevision).toBe(2);
  expect(result.current.series[0].values).toEqual([2, 2]);
  unmount();
  proxy.dispose();
  jest.restoreAllMocks();
});

it('preserves each returned value when history samples share a timestamp', () => {
  const proxy = makeProxy();
  const { result, unmount } = renderHook(() =>
    useTrendModel([proxy], [proxy.key])
  );
  act(() => result.current.requestHistory([0, 30000]));
  act(() =>
    proxy.historic_data.fire(
      new HashList([sample(1, 10), sample(2, 10), sample(3, 20)])
    )
  );
  expect(result.current.series[0]).toMatchObject({
    timestamps: [10000, 10000, 20000],
    values: [1, 2, 3],
  });
  unmount();
  proxy.dispose();
  jest.restoreAllMocks();
});

it('evaluates replies using each curve’s latest requested interval', () => {
  const first = makeProxy();
  const root = new DeviceProxy('B');
  root.binding.value!.set('value', new DoubleBinding());
  const second = new PropertyProxy(root, 'value');
  jest.spyOn(second, 'getHistory').mockImplementation(() => {});
  const { result, unmount } = renderHook(() =>
    useTrendModel([first, second], [first.key, second.key])
  );
  act(() => result.current.requestHistory([0, 100000]));
  const initial = new HashList(
    [10, 20, 30, 40, 50].map((time) => sample(1, time))
  );
  act(() => {
    first.historic_data.fire(initial);
    second.historic_data.fire(initial);
  });
  // Change the interval for every curve before an older reply arrives. Counts
  // in the latest interval reject its expanded coverage for both curves.
  act(() => result.current.requestHistory([30000, 50000]));
  const olderReply = new HashList([sample(2, 0), sample(2, 99)]);
  act(() => {
    first.historic_data.fire(olderReply);
    second.historic_data.fire(olderReply);
  });
  expect(result.current.series[0].values).toEqual([1, 1, 1, 1, 1]);
  expect(result.current.series[1].values).toEqual([1, 1, 1, 1, 1]);
  unmount();
  first.dispose();
  second.dispose();
  jest.restoreAllMocks();
});
