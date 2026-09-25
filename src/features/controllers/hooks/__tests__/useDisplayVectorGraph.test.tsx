import { act, cleanup, renderHook } from '@testing-library/react';
import type { PropertyProxy } from '@/lib/binding/PropertyProxy';
import { ProxyStatus } from '@/lib/binding/api';
import { VectorFloatValue, VectorInt64Value } from '@/karabo/data/types';
import { useDisplayVectorGraph } from '../useDisplayVectorGraph';

const originalRequestIdleCallback = window.requestIdleCallback;
const originalCancelIdleCallback = window.cancelIdleCallback;

const makeProxy = (value: unknown): PropertyProxy =>
  ({ root: { status: ProxyStatus.MONITORING }, value }) as PropertyProxy;

function flushIdle() {
  act(() => jest.runOnlyPendingTimers());
}

describe('useDisplayVectorGraph', () => {
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
  });

  afterEach(() => {
    cleanup();
    window.requestIdleCallback = originalRequestIdleCallback;
    window.cancelIdleCallback = originalCancelIdleCallback;
    jest.useRealTimers();
  });

  it('publishes the latest complete vector when the browser is idle', () => {
    const proxy = makeProxy([1, 2]);
    const { result, rerender } = renderHook(() => useDisplayVectorGraph(proxy));

    expect(result.current.values).toEqual(new Float64Array());
    Object.assign(proxy, { value: [3, 4, 5] });
    rerender();

    expect(window.requestIdleCallback).toHaveBeenCalledTimes(1);
    flushIdle();
    expect(result.current.values).toEqual(new Float64Array([3, 4, 5]));
    expect(result.current.rawLength).toBe(3);
  });

  it('keeps non-finite numeric samples for viewport sampling', () => {
    const values = [1, Number.NaN, 3, Number.POSITIVE_INFINITY, 5];
    const { result } = renderHook(() =>
      useDisplayVectorGraph(makeProxy(values))
    );

    flushIdle();
    expect(result.current.values).toEqual(
      new Float64Array([1, Number.NaN, 3, Number.POSITIVE_INFINITY, 5])
    );
    expect(result.current.rawLength).toBe(5);
  });

  it('reuses the Karabo typed vector including non-finite samples', () => {
    const values = new VectorFloatValue([1, NaN, Infinity]);
    const { result } = renderHook(() =>
      useDisplayVectorGraph(makeProxy(values))
    );

    flushIdle();
    expect(result.current.values).toBe(values);
  });

  it('converts BigInt samples without changing their Karabo source', () => {
    const values = new VectorInt64Value([1n, -2n]);
    const { result } = renderHook(() =>
      useDisplayVectorGraph(makeProxy(values))
    );

    flushIdle();
    expect(result.current.values).toEqual(new Float64Array([1, -2]));
    expect(Array.from(values)).toEqual([1n, -2n]);
  });
});
