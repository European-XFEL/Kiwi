import { act, cleanup, renderHook } from '@testing-library/react';
import React from 'react';
import type { PropertyProxy } from '@/lib/binding/api';
import { useVectorXYData } from '../useVectorXYData';

const property = (value: unknown) => ({ value }) as PropertyProxy;
const originalRequest = window.requestIdleCallback;
const originalCancel = window.cancelIdleCallback;
const flush = () => act(() => jest.runOnlyPendingTimers());

test('publishes after Strict Mode cancels and restarts mount effects', () => {
  const proxies = [property([1]), property([2])];
  const { result } = renderHook(() => useVectorXYData(proxies, ['x', 'y']), {
    wrapper: React.StrictMode,
  });
  flush();
  expect(result.current.x).toEqual(new Float64Array([1]));
  expect(result.current.series[0].values).toEqual(new Float64Array([2]));
});

beforeEach(() => {
  jest.useFakeTimers();
  window.requestIdleCallback = jest.fn((callback: IdleRequestCallback) =>
    window.setTimeout(
      () => callback({ didTimeout: false, timeRemaining: () => 50 }),
      0
    )
  );
  window.cancelIdleCallback = jest.fn((id) => window.clearTimeout(id));
});
afterEach(() => {
  cleanup();
  window.requestIdleCallback = originalRequest;
  window.cancelIdleCallback = originalCancel;
  jest.useRealTimers();
});

test('coalesces independent updates into one publication of latest X and every Y', () => {
  const x = property([1, 2, 3]);
  const y = property([4, 5]);
  const z = property(new Int16Array([6, 7, 8, 9]));
  const { result, rerender } = renderHook(() =>
    useVectorXYData([x, y, z], ['x', 'y', 'z'])
  );
  expect(result.current.x.length).toBe(0);
  Object.assign(x, { value: [10, 20, 30] });
  rerender();
  Object.assign(y, { value: [40] });
  rerender();
  expect(window.requestIdleCallback).toHaveBeenCalledTimes(1);
  expect(window.requestIdleCallback).toHaveBeenCalledWith(
    expect.any(Function),
    { timeout: 1000 }
  );
  flush();
  expect(result.current.x).toEqual(new Float64Array([10, 20, 30]));
  expect(result.current.series).toEqual([
    { key: 'y', values: new Float64Array([40]) },
    { key: 'z', values: z.value },
  ]);
  expect(result.current.series[1].values).toBe(z.value);
  Object.assign(z, { value: new BigInt64Array([9n, -2n]) });
  rerender();
  flush();
  expect(result.current.series[1].values).toEqual(new Float64Array([9, -2]));
});

test('retains missing slots and clears vectors without retaining history', () => {
  const x = property([1, 2]);
  const y = property([3, 4]);
  const { result, rerender } = renderHook(
    ({ proxies }) => useVectorXYData(proxies, ['x', 'y', 'z']),
    {
      initialProps: { proxies: [x, y, undefined] },
    }
  );
  flush();
  expect(result.current.series.map((s) => s.values.length)).toEqual([2, 0]);
  rerender({ proxies: [x, undefined, property([8])] });
  flush();
  expect(result.current.series.map((s) => s.values.length)).toEqual([0, 1]);
  Object.assign(x, { value: [] });
  rerender({ proxies: [x, y, undefined] });
  flush();
  expect(result.current.x.length).toBe(0);
  rerender({ proxies: [undefined, y, undefined] });
  flush();
  expect(result.current.x.length).toBe(0);
});

test('discards obsolete data immediately on key replacement and publishes new pending values', () => {
  const { result, rerender, unmount } = renderHook(
    ({ keys, proxies }) => useVectorXYData(proxies, keys),
    {
      initialProps: {
        keys: ['x', 'y'],
        proxies: [property([1]), property([2])],
      },
    }
  );
  flush();
  rerender({
    keys: ['a', 'b', 'c'],
    proxies: [property([3]), property([4]), property([5])],
  });
  expect(result.current.x.length).toBe(0);
  expect(result.current.series.map((s) => [s.key, s.values.length])).toEqual([
    ['b', 0],
    ['c', 0],
  ]);
  rerender({ keys: ['p', 'q'], proxies: [property([8]), property([9])] });
  flush();
  expect(result.current.x).toEqual(new Float64Array([8]));
  expect(result.current.series).toEqual([
    { key: 'q', values: new Float64Array([9]) },
  ]);
  rerender({ keys: ['p', 'q'], proxies: [property([10]), property([11])] });
  unmount();
  expect(window.cancelIdleCallback).toHaveBeenCalledTimes(1);
  flush();
});
