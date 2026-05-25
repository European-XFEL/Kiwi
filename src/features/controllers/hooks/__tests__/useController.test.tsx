import { act, renderHook, waitFor } from '@testing-library/react';

import { AccessLevel, AccessMode } from '@/karabo/data/enums';
import { DeviceProxy, PropertyProxy } from '@/lib/binding/api';
import { ProxyStatus } from '@/lib/binding/ProxyStatus';
import { SingletonContext } from '@/testing';

import { useProxies } from '../useProxies';
import { useController } from '../useController';
import {
  getControllerIndicator,
  isProxyAllowed,
} from '../../utils/controller_semantics';

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

describe('useController', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps keys[0] as the controller root even when secondary devices update', async () => {
    const { devices, topology } = makeTopology();

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
        (devices.get('DEVICE_B') as any).updateStatus(ProxyStatus.MONITORING);
      });

      expect(result.current.primary.deviceId).toBe('DEVICE_A');
      expect(result.current.primary.rootDevice?.deviceId).toBe('DEVICE_A');
      expect(result.current.proxies[1].root.deviceId).toBe('DEVICE_B');
      expect(result.current.proxies[1].root.status).toBe(
        ProxyStatus.MONITORING
      );

      unmount();
    });
  });

  it('starts monitoring for each property proxy and updates secondary proxy device status', async () => {
    const { devices, topology } = makeTopology();
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

      const deviceA = devices.get('DEVICE_A');
      const deviceB = devices.get('DEVICE_B');

      expect(deviceA?.addMonitor).toHaveBeenCalledTimes(2);
      expect(deviceB?.addMonitor).toHaveBeenCalledTimes(1);

      act(() => {
        (deviceB as any).updateStatus(ProxyStatus.MONITORING);
      });

      expect(result.current.proxies[0].root.deviceId).toBe('DEVICE_A');
      expect(result.current.primary.rootDevice?.deviceProxy).toBe(deviceA);
      expect(result.current.primary.rootDevice?.deviceId).toBe('DEVICE_A');
      expect(result.current.primary.rootDevice?.deviceStatus).toBe(
        ProxyStatus.OFFLINE
      );
      expect(result.current.primary.deviceId).toBe('DEVICE_A');
      expect(result.current.primary.propertyPath).toBe('speed');
      expect(result.current.proxies[0].root.status).toBe(ProxyStatus.OFFLINE);
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
    const { devices, topology } = makeTopology();

    await SingletonContext.run({ topology }, async () => {
      const deviceA = topology.getDevice('DEVICE_A') as MockDevice;
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
        expect(result.current.proxies[0]).toBeInstanceOf(PropertyProxy);
      });

      expect(result.current.primary.rootDevice?.deviceStatus).toBe(
        ProxyStatus.ONLINEREQUESTED
      );
      expect(result.current.proxies[0].root.status).toBe(
        ProxyStatus.ONLINEREQUESTED
      );

      unmount();

      expect(devices.get('DEVICE_A')?.addMonitor).toHaveBeenCalledTimes(1);
      expect(stopMonitoring).toHaveBeenCalledTimes(1);
    });
  });

  it('primary mirrors the shared controller indicator helper output', () => {
    const deviceProxy = new DeviceProxy('DEVICE_A');
    const propertyProxy = new PropertyProxy(deviceProxy, 'speed');

    const { result, unmount } = renderHook(() =>
      useController([propertyProxy])
    );

    const indicator = getControllerIndicator(['DEVICE_A.speed'], propertyProxy);

    expect(result.current.primary.tooltipText).toBe(indicator.bindingLabel);
    expect(result.current.primary.disabledReason).toBe(indicator.statusText);
    expect(result.current.primary.existing).toBe(propertyProxy.existing);
    expect(result.current.primary.propertyStatus).toBe(
      indicator.propertyStatus
    );
    expect(result.current.primary.propertyIndicator).toBe(
      indicator.propertyIndicator
    );

    unmount();
    propertyProxy.dispose();
  });

  it('primary editability mirrors the shared proxy-allowed helper', () => {
    const deviceProxy = new DeviceProxy('TEST_DEVICE');
    (deviceProxy as any).status = ProxyStatus.MONITORING;

    const propertyProxy = new PropertyProxy(deviceProxy, 'speed');
    propertyProxy.binding = {
      accessMode: AccessMode.RECONFIGURABLE,
      requiredAccessLevel: AccessLevel.OBSERVER,
      is_allowed: () => true,
      hashType: undefined,
    } as any;

    const { result, unmount } = renderHook(() =>
      useController([propertyProxy])
    );

    expect(result.current.primary.isEditable).toBe(
      isProxyAllowed(propertyProxy, AccessLevel.OBSERVER)
    );
    expect(result.current.primary.canEdit).toBe(true);

    unmount();
    propertyProxy.dispose();
  });
});
