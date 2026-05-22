import { act, renderHook, waitFor } from '@testing-library/react';

import { DeviceProxy, PropertyProxy } from '@/lib/binding/api';
import { SingletonContext } from '@/testing';

import { useProxies } from '../useProxies';

const makeTopology = () => {
  const devices = new Map<string, DeviceProxy>();

  const getDevice = jest.fn((deviceId: string) => {
    let device = devices.get(deviceId);
    if (!device) {
      device = new DeviceProxy(deviceId);
      const stop = jest.fn();
      jest.spyOn(device, 'addMonitor').mockReturnValue(stop);
      devices.set(deviceId, device);
    }
    return device;
  });

  return { devices, topology: { getDevice } };
};

describe('useProxies', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('produces one real PropertyProxy per scene key', async () => {
    const { topology } = makeTopology();

    await SingletonContext.run({ topology }, async () => {
      const { result, unmount } = renderHook(() => useProxies(['DEV.speed']));

      await waitFor(() =>
        expect(result.current[0]).toBeInstanceOf(PropertyProxy)
      );

      expect(result.current).toHaveLength(1);
      unmount();
    });
  });

  it('preserves scene key order, including nested property paths', async () => {
    const { topology } = makeTopology();

    await SingletonContext.run({ topology }, async () => {
      const { result, unmount } = renderHook(() =>
        useProxies(['DEV_A.motor.speed.value', 'DEV_B.temp'])
      );

      await waitFor(() =>
        expect(result.current[1]).toBeInstanceOf(PropertyProxy)
      );

      expect(result.current[0]).toBeInstanceOf(PropertyProxy);
      expect(result.current[0].path).toBe('motor.speed.value');
      expect(result.current[1].path).toBe('temp');

      unmount();
    });
  });

  it('disposes proxies on unmount', async () => {
    const { topology } = makeTopology();
    const disposeSpy = jest.spyOn(PropertyProxy.prototype, 'dispose');

    await SingletonContext.run({ topology }, async () => {
      const { result, unmount } = renderHook(() => useProxies(['DEV.speed']));

      await waitFor(() =>
        expect(result.current[0]).toBeInstanceOf(PropertyProxy)
      );

      unmount();
      expect(disposeSpy).toHaveBeenCalled();
    });
  });

  it('recreates proxies and disposes old ones when keys change', async () => {
    const { topology } = makeTopology();
    const disposeSpy = jest.spyOn(PropertyProxy.prototype, 'dispose');

    await SingletonContext.run({ topology }, async () => {
      const { result, rerender, unmount } = renderHook(
        ({ keys }: { keys: string[] }) => useProxies(keys),
        { initialProps: { keys: ['DEV_A.speed'] } }
      );

      await waitFor(() =>
        expect(result.current[0]).toBeInstanceOf(PropertyProxy)
      );

      const firstProxy = result.current[0];

      rerender({ keys: ['DEV_B.temp'] });

      await waitFor(() =>
        expect(result.current[0]).toBeInstanceOf(PropertyProxy)
      );

      expect(result.current[0]).not.toBe(firstProxy);
      expect(disposeSpy).toHaveBeenCalled();

      unmount();
    });
  });

  it('does not replace the proxies array when a device update fires with unchanged state and status', async () => {
    const { devices, topology } = makeTopology();

    await SingletonContext.run({ topology }, async () => {
      const { result, unmount } = renderHook(() => useProxies(['DEV_A.speed']));

      await waitFor(() =>
        expect(result.current[0]).toBeInstanceOf(PropertyProxy)
      );

      const proxiesBefore = result.current;
      const proxyBefore = result.current[0];

      act(() => {
        devices.get('DEV_A')!.state_update.fire(undefined);
      });

      expect(result.current).toBe(proxiesBefore);
      expect(result.current[0]).toBe(proxyBefore);

      unmount();
    });
  });
});
