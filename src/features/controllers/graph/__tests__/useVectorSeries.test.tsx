import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { VectorBinding } from '@/lib/binding/api';
import { makeVectorProxy } from '../testing/vectorProxy';
import { useVectorSeries } from '../useVectorSeries';

const originalRequest = window.requestIdleCallback;
const originalCancel = window.cancelIdleCallback;
const flush = () => act(() => jest.runOnlyPendingTimers());

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

test('coalesces vectors of independent lengths and retains missing slots', () => {
  const a = makeVectorProxy([1, 2]);
  const b = makeVectorProxy(new Int16Array([3]));
  const { result, rerender } = renderHook(() =>
    useVectorSeries([a, undefined, b], ['a', 'missing', 'b'])
  );
  a.binding!.setValue([4, 5, 6], undefined);
  rerender();
  b.binding!.setValue(new BigInt64Array([7n]), undefined);
  rerender();
  expect(window.requestIdleCallback).toHaveBeenCalledTimes(1);
  flush();
  expect(result.current).toEqual([
    { key: 'a', values: new Float64Array([4, 5, 6]) },
    { key: 'missing', values: new Float64Array() },
    { key: 'b', values: new Float64Array([7]) },
  ]);
  rerender();
  expect(jest.getTimerCount()).toBe(0);
  a.binding!.setValue([], undefined);
  rerender();
  flush();
  expect(result.current[0].values.length).toBe(0);
});

test('detects proxy and binding replacements even without timestamp changes', () => {
  const a = makeVectorProxy([1]);
  const { result, rerender } = renderHook(
    ({ proxy }) => useVectorSeries([proxy], ['a']),
    { initialProps: { proxy: a } }
  );
  flush();
  const replacement = makeVectorProxy([2]);
  replacement.binding!.timestamp = a.binding!.timestamp;
  rerender({ proxy: replacement });
  flush();
  expect(Array.from(result.current[0].values)).toEqual([2]);
  const binding = new VectorBinding();
  binding.setValue([3], undefined);
  binding.timestamp = replacement.binding!.timestamp;
  replacement.root.binding.value!.set('vector', binding);
  replacement.root.schema_update.fire();
  rerender({ proxy: replacement });
  flush();
  expect(Array.from(result.current[0].values)).toEqual([3]);
});

test('clears obsolete key slots and reads the latest pending proxies in Strict Mode', () => {
  const a = makeVectorProxy([1]);
  const b = makeVectorProxy([2]);
  const { result, rerender, unmount } = renderHook(
    ({ keys, proxies }) => useVectorSeries(proxies, keys),
    {
      initialProps: { keys: ['a'], proxies: [a] },
      wrapper: React.StrictMode,
    }
  );
  flush();
  rerender({ keys: ['b', 'a'], proxies: [b, a] });
  expect(result.current.map((item) => item.values.length)).toEqual([0, 0]);
  rerender({ keys: ['b', 'a'], proxies: [a, b] });
  flush();
  expect(result.current.map((item) => Array.from(item.values))).toEqual([
    [1],
    [2],
  ]);
  rerender({ keys: ['a'], proxies: [b] });
  unmount();
  expect(jest.getTimerCount()).toBe(0);
});
