import { act, renderHook, waitFor } from '@testing-library/react';

import { DeviceProxy, PropertyProxy } from '@/lib/binding/api';
import { ProxyStatus } from '@/lib/binding/ProxyStatus';
import { SingletonContext } from '@/testing';

import { useController } from '../useController_';

type MockDevice = DeviceProxy & {
  stopMonitoring: jest.Mock;
};

const makeTopology = () => {
  const devices = new Map<string, MockDevice>();

  const getDevice = jest.fn((deviceId: string) => {
    let device = devices.get(deviceId);
    if (!device) {
      const stopMonitoring = jest.fn();
      device = new DeviceProxy(deviceId) as MockDevice;
      device.stopMonitoring = stopMonitoring;
      jest.spyOn(device, 'addMonitor').mockReturnValue(stopMonitoring);
      devices.set(deviceId, device);
    }
    return device;
  });

  return {
    devices,
    topology: { getDevice },
  };
};

describe('useController_', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps keys[0] as root and does not promote a secondary valid proxy', async () => {
    const { topology } = makeTopology();

    await SingletonContext.run({ topology }, async () => {
      const { result, unmount } = renderHook(() =>
        useController(['broken', 'DEVICE_B.temperature'])
      );

      expect(result.current.propertyProxies).toHaveLength(2);
      expect(result.current.propertyProxies[0].deviceId).toBeUndefined();
      expect(result.current.propertyProxies[0].proxy).toBeUndefined();
      expect(result.current.root).toBeUndefined();

      await waitFor(() => {
        expect(result.current.propertyProxies[1].proxy).toBeInstanceOf(
          PropertyProxy
        );
      });

      expect(result.current.propertyProxies[0].deviceId).toBeUndefined();
      expect(result.current.root).toBeUndefined();
      expect(result.current.propertyProxies[1]).toMatchObject({
        deviceId: 'DEVICE_B',
        propertyPath: 'temperature',
        deviceStatus: ProxyStatus.OFFLINE,
      });

      unmount();
    });
  });

  it('starts monitoring for each property proxy and updates secondary proxy device status', async () => {
    const { devices, topology } = makeTopology();
    const disposeSpy = jest.spyOn(PropertyProxy.prototype, 'dispose');

    await SingletonContext.run({ topology }, async () => {
      const { result, unmount } = renderHook(() =>
        useController([
          'DEVICE_A.speed',
          'DEVICE_B.temperature',
          'DEVICE_A.position',
        ])
      );

      await waitFor(() => {
        expect(result.current.propertyProxies[2].proxy).toBeInstanceOf(
          PropertyProxy
        );
      });

      const deviceA = devices.get('DEVICE_A');
      const deviceB = devices.get('DEVICE_B');

      expect(deviceA?.addMonitor).toHaveBeenCalledTimes(2);
      expect(deviceB?.addMonitor).toHaveBeenCalledTimes(1);

      act(() => {
        deviceB!.status = ProxyStatus.MONITORING;
        deviceB!.status_update.fire(ProxyStatus.MONITORING);
      });

      expect(result.current.propertyProxies[0].deviceId).toBe('DEVICE_A');
      expect(result.current.root).toBe(result.current.propertyProxies[0]);
      expect(result.current.root?.deviceProxy).toBe(deviceA);
      expect(result.current.root?.deviceId).toBe('DEVICE_A');
      expect(result.current.root?.deviceStatus).toBe(ProxyStatus.OFFLINE);
      expect(result.current.propertyProxies[0].deviceStatus).toBe(
        ProxyStatus.OFFLINE
      );
      expect(result.current.propertyProxies[1]).toMatchObject({
        deviceId: 'DEVICE_B',
        propertyPath: 'temperature',
        deviceStatus: ProxyStatus.MONITORING,
      });

      unmount();

      expect(deviceA?.stopMonitoring).toHaveBeenCalledTimes(2);
      expect(deviceB?.stopMonitoring).toHaveBeenCalledTimes(1);
      expect(disposeSpy).toHaveBeenCalledTimes(3);
    });
  });

  it('captures synchronous addMonitor status changes in the initial proxy snapshot', async () => {
    const { devices, topology } = makeTopology();

    await SingletonContext.run({ topology }, async () => {
      const deviceA = topology.getDevice('DEVICE_A') as MockDevice;
      const stopMonitoring = jest.fn();

      (deviceA.addMonitor as jest.Mock).mockImplementation(() => {
        deviceA.status = ProxyStatus.ONLINEREQUESTED;
        deviceA.status_update.fire(ProxyStatus.ONLINEREQUESTED);
        return stopMonitoring;
      });

      const { result, unmount } = renderHook(() =>
        useController(['DEVICE_A.speed'])
      );

      await waitFor(() => {
        expect(result.current.root?.proxy).toBeInstanceOf(PropertyProxy);
      });

      expect(result.current.root?.deviceStatus).toBe(
        ProxyStatus.ONLINEREQUESTED
      );
      expect(result.current.propertyProxies[0].deviceStatus).toBe(
        ProxyStatus.ONLINEREQUESTED
      );

      unmount();

      expect(devices.get('DEVICE_A')?.addMonitor).toHaveBeenCalledTimes(1);
      expect(stopMonitoring).toHaveBeenCalledTimes(1);
    });
  });
});
