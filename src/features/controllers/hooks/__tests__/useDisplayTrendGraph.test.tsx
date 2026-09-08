import { renderHook, waitFor } from '@testing-library/react';

import type { PropertyProxy } from '@/lib/binding/PropertyProxy';

import { useDisplayTrendGraph } from '../useDisplayTrendGraph';

const makeProxy = (value: number, timestampSeconds: number): PropertyProxy =>
  ({
    root: { deviceId: 'DEVICE' },
    path: 'value',
    value,
    timestamp: { toTimestamp: () => timestampSeconds },
  }) as PropertyProxy;

const updateProxy = (
  proxy: PropertyProxy,
  value: number,
  timestampSeconds: number
) => {
  Object.assign(proxy, {
    value,
    timestamp: { toTimestamp: () => timestampSeconds },
  });
};

describe('useDisplayTrendGraph', () => {
  it('publishes every network-driven sample', async () => {
    const initialTimestamp = Date.now() / 1000;
    const proxy = makeProxy(42, initialTimestamp);
    const { result, rerender } = renderHook(
      ({ proxies }) => useDisplayTrendGraph(proxies, false, 'DEVICE'),
      { initialProps: { proxies: [proxy] } }
    );

    await waitFor(() => expect(result.current.dataPoints).toBe(1));

    updateProxy(proxy, 43, initialTimestamp + 1);
    rerender({ proxies: [proxy] });
    expect(result.current.series[0].values).toEqual(new Float64Array([42, 43]));

    updateProxy(proxy, 44, initialTimestamp + 2);
    rerender({ proxies: [proxy] });
    expect(result.current.series[0].values).toEqual(
      new Float64Array([42, 43, 44])
    );
  });

  it('clears generated data when the device goes offline', async () => {
    const proxy = makeProxy(42, Date.now() / 1000);
    const { result, rerender } = renderHook(
      ({ isOffline }) => useDisplayTrendGraph([proxy], isOffline, 'DEVICE'),
      { initialProps: { isOffline: false } }
    );

    await waitFor(() => expect(result.current.dataPoints).toBe(1));

    rerender({ isOffline: true });

    expect(result.current.dataPoints).toBe(0);
  });
});
