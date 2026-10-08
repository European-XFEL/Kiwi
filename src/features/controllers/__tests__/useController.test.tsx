import { act, renderHook, waitFor } from '@testing-library/react';

import {
  BindingRoot,
  DeviceProxy,
  DoubleBinding,
  PropertyProxy,
} from '@/lib/binding/api';
import { AccessMode } from '@/karabo/data/api';
import { getNetwork } from '@/lib/singletons/api';
import { ProxyStatus } from '@/lib/binding/ProxyStatus';
import { createMockSystemTopology, SingletonContext } from '@/testing';

import { useProxies } from '../useProxies';
import { useController } from '../useController';

const makeTopology = createMockSystemTopology;

describe('useController', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps the latest action registration and uses current proxies after rerender', () => {
    const send = jest
      .spyOn(getNetwork(), 'onReconfigure')
      .mockImplementation(() => {});
    const device = new DeviceProxy('DEVICE_A');
    const binding = new BindingRoot();
    binding.value!.set('speed', new DoubleBinding({ value: 1.25 }));
    binding.value!.set('temperature', new DoubleBinding({ value: 2.5 }));
    device.binding = binding;
    device.status = ProxyStatus.MONITORING;
    binding.value!.get('speed').accessMode = AccessMode.RECONFIGURABLE;
    binding.value!.get('temperature').accessMode = AccessMode.RECONFIGURABLE;
    const first = new PropertyProxy(device, 'speed');
    const second = new PropertyProxy(device, 'temperature');
    first.edit_value = 3.5;
    second.edit_value = 9;
    const { result, rerender, unmount } = renderHook(
      ({ proxies }) => useController(proxies),
      { initialProps: { proxies: [first] } }
    );
    const oldApply = jest.fn();
    const removeOld = result.current.editActions!.register({ apply: oldApply });
    const apply = jest.fn();
    const removeCurrent = result.current.editActions!.register({ apply });
    removeOld();
    rerender({ proxies: [second] });

    result.current.editActions!.apply();
    expect(oldApply).not.toHaveBeenCalled();
    expect(apply).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();

    removeCurrent();
    result.current.editActions!.apply();
    expect(apply).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
    result.current.editActions!.decline();
    expect(second.edit_value).toBeUndefined();
    expect(first.edit_value.value_).toBe(3.5);

    unmount();
    first.dispose();
    second.dispose();
  });

  it('keeps keys[0] as the controller root even when secondary devices update', async () => {
    const topology = makeTopology();

    await SingletonContext.run({ topology }, async () => {
      const keys = ['DEVICE_A.speed', 'DEVICE_B.temperature'];
      const { result, unmount } = renderHook(() => {
        const proxies = useProxies(keys);
        return useController(proxies);
      });

      await waitFor(() => {
        expect(result.current.proxies[1]).toBeInstanceOf(PropertyProxy);
      });

      act(() => {
        (topology.getDevice('DEVICE_B') as any).updateStatus(
          ProxyStatus.MONITORING
        );
      });

      expect(result.current.proxy).toBe(result.current.proxies[0]);
      expect(result.current.proxy?.root.deviceId).toBe('DEVICE_A');
      expect(result.current.proxy?.path).toBe('speed');
      expect(result.current.proxies[1].root.deviceId).toBe('DEVICE_B');
      expect(result.current.proxies[1].root.status).toBe(
        ProxyStatus.MONITORING
      );

      unmount();
    });
  });

  it('starts monitoring for each property proxy and updates secondary proxy device status', async () => {
    const topology = makeTopology();
    const disposeSpy = jest.spyOn(PropertyProxy.prototype, 'dispose');

    await SingletonContext.run({ topology }, async () => {
      const keys = [
        'DEVICE_A.speed',
        'DEVICE_B.temperature',
        'DEVICE_A.position',
      ];
      const { result, unmount } = renderHook(() => {
        const proxies = useProxies(keys);
        return useController(proxies);
      });

      await waitFor(() => {
        expect(result.current.proxies[2]).toBeInstanceOf(PropertyProxy);
      });

      const deviceA = topology.getDevice('DEVICE_A');
      const deviceB = topology.getDevice('DEVICE_B');

      expect(deviceA?.addMonitor).toHaveBeenCalledTimes(2);
      expect(deviceB?.addMonitor).toHaveBeenCalledTimes(1);

      act(() => {
        (deviceB as any).updateStatus(ProxyStatus.MONITORING);
      });

      expect(result.current.proxy?.root.deviceId).toBe('DEVICE_A');
      expect(result.current.proxy?.path).toBe('speed');
      expect(result.current.proxy?.root.status).toBe(ProxyStatus.OFFLINE);
      expect(result.current.proxies[1].root.deviceId).toBe('DEVICE_B');
      expect(result.current.proxies[1].path).toBe('temperature');
      expect(result.current.proxies[1].root.status).toBe(
        ProxyStatus.MONITORING
      );

      unmount();

      expect(deviceA?.stopMonitoring).toHaveBeenCalledTimes(2);
      expect(deviceB?.stopMonitoring).toHaveBeenCalledTimes(1);
      expect(disposeSpy).toHaveBeenCalledTimes(3);
    });
  });

  it('captures synchronous addMonitor status changes in the initial proxy snapshot', async () => {
    const topology = makeTopology();

    await SingletonContext.run({ topology }, async () => {
      const deviceA = topology.getDevice('DEVICE_A');
      const stopMonitoring = jest.fn();

      (deviceA.addMonitor as jest.Mock).mockImplementation(() => {
        (deviceA as any).updateStatus(ProxyStatus.ONLINEREQUESTED);
        return stopMonitoring;
      });

      const keys = ['DEVICE_A.speed'];
      const { result, unmount } = renderHook(() => {
        const proxies = useProxies(keys);
        return useController(proxies);
      });

      await waitFor(() => {
        expect(result.current.proxy).toBeInstanceOf(PropertyProxy);
      });

      expect(result.current.proxy?.root.status).toBe(
        ProxyStatus.ONLINEREQUESTED
      );

      unmount();

      expect(topology.getDevice('DEVICE_A')?.addMonitor).toHaveBeenCalledTimes(
        1
      );
      expect(stopMonitoring).toHaveBeenCalledTimes(1);
    });
  });
});
