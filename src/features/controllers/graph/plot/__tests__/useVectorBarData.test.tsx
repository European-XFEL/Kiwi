import { act, cleanup, renderHook } from '@testing-library/react';
import type { PropertyProxy } from '@/lib/binding/api';
import { useVectorSeries } from '../useVectorSeries';

const useData = (proxy: PropertyProxy | undefined) => ({
  values: useVectorSeries({ proxies: [proxy], keys: ['vector'] })[0].values,
});
import { makeVectorProxy } from '../testing/vectorProxy';

const originalRequest = window.requestIdleCallback;
const originalCancel = window.cancelIdleCallback;

describe('complete vector publication', () => {
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
    window.requestIdleCallback = originalRequest;
    window.cancelIdleCallback = originalCancel;
    jest.useRealTimers();
  });

  it('publishes the latest complete vector at idle without downsampling', () => {
    const proxy = makeVectorProxy(
      Float64Array.from({ length: 4000 }, (_, index) => -index)
    );
    const { result, rerender } = renderHook(() => useData(proxy));
    expect(result.current.values).toHaveLength(0);
    const latest = Float64Array.from({ length: 5000 }, (_, index) => index);
    proxy.binding!.setValue(latest, undefined);
    rerender();
    expect(window.requestIdleCallback).toHaveBeenCalledTimes(1);
    act(() => jest.runOnlyPendingTimers());
    expect(result.current.values).toEqual(latest);
    expect(result.current.values).toHaveLength(5000);
  });

  it('clears published bars when the proxy is removed', () => {
    const { result, rerender } = renderHook(({ proxy }) => useData(proxy), {
      initialProps: {
        proxy: makeVectorProxy([2, -3]) as PropertyProxy | undefined,
      },
    });
    act(() => jest.runOnlyPendingTimers());
    expect(result.current.values).toEqual(new Float64Array([2, -3]));
    rerender({ proxy: undefined });
    act(() => jest.runOnlyPendingTimers());
    expect(result.current.values).toHaveLength(0);
  });
});
