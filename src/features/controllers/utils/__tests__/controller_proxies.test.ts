import { BindingRoot, DeviceProxy, PropertyProxy } from '@/lib/binding/api';
import { ProxyStatus } from '@/lib/binding/ProxyStatus';
import { SingletonContext } from '@/testing';

import {
  createEmptyProxyContexts,
  createPropertyProxyContexts,
  createPropertyProxies,
  disposePropertyProxies,
  startMonitoring,
  validateKeys,
  type PropertyProxyEntries,
} from '../controller_proxies';

describe('controller proxy utilities', () => {
  it('validates keys without losing slot alignment', () => {
    const targets = validateKeys([
      'DEVICE_A.speed',
      undefined,
      'broken',
      ' DEVICE_B.temperature ',
    ]);

    expect(targets).toEqual([
      {
        raw: 'DEVICE_A.speed',
        deviceId: 'DEVICE_A',
        propertyPath: 'speed',
      },
      null,
      null,
      {
        raw: 'DEVICE_B.temperature',
        deviceId: 'DEVICE_B',
        propertyPath: 'temperature',
      },
    ]);
  });

  it('builds placeholder contexts for every key slot', () => {
    const targets = validateKeys(['DEVICE_A.speed', 'broken']);
    const contexts = createEmptyProxyContexts(targets);

    expect(contexts).toHaveLength(2);
    expect(contexts[0]).toMatchObject({
      proxy: undefined,
      deviceProxy: undefined,
      deviceId: 'DEVICE_A',
      propertyPath: 'speed',
      deviceStatus: ProxyStatus.OFFLINE,
    });
    expect(contexts[1]).toMatchObject({
      proxy: undefined,
      deviceProxy: undefined,
      deviceId: undefined,
      propertyPath: undefined,
      deviceStatus: ProxyStatus.OFFLINE,
    });
  });

  it('keeps key hints when a proxy context is missing for a valid slot', () => {
    const targets = validateKeys(['DEVICE_A.speed', 'broken']);
    const entries: PropertyProxyEntries = [null, null];
    const contexts = createPropertyProxyContexts(entries, targets);

    expect(contexts[0]).toMatchObject({
      proxy: undefined,
      deviceProxy: undefined,
      deviceId: 'DEVICE_A',
      propertyPath: 'speed',
      deviceStatus: ProxyStatus.OFFLINE,
    });
    expect(contexts[1]).toMatchObject({
      proxy: undefined,
      deviceProxy: undefined,
      deviceId: undefined,
      propertyPath: undefined,
      deviceStatus: ProxyStatus.OFFLINE,
    });
  });

  it("creates one property proxy per valid key on that key's own device", async () => {
    const devices = new Map<string, DeviceProxy>();
    const topology = {
      getDevice: jest.fn((deviceId: string) => {
        let device = devices.get(deviceId);
        if (!device) {
          device = new DeviceProxy(deviceId);
          device.binding = new BindingRoot();
          devices.set(deviceId, device);
        }
        return device;
      }),
    };

    await SingletonContext.run({ topology }, () => {
      const targets = validateKeys([
        'DEVICE_A.speed',
        'broken',
        'DEVICE_B.temperature',
      ]);
      const entries = createPropertyProxies(targets);

      expect(entries).toHaveLength(3);
      expect(entries[0]).toBeInstanceOf(PropertyProxy);
      expect(entries[0]?.root.deviceId).toBe('DEVICE_A');
      expect(entries[0]?.path).toBe('speed');

      expect(entries[1]).toBeNull();

      expect(entries[2]).toBeInstanceOf(PropertyProxy);
      expect(entries[2]?.root.deviceId).toBe('DEVICE_B');
      expect(entries[2]?.path).toBe('temperature');

      disposePropertyProxies(entries);
    });
  });

  it('starts monitoring for every property proxy and deduplicates device subscriptions', () => {
    const deviceA = new DeviceProxy('DEVICE_A');
    const deviceB = new DeviceProxy('DEVICE_B');

    const stopDeviceA1 = jest.fn(() => {
      deviceA.status = ProxyStatus.ONLINE;
      deviceA.status_update.fire(ProxyStatus.ONLINE);
    });
    const stopDeviceA2 = jest.fn(() => {
      deviceA.status = ProxyStatus.ONLINE;
      deviceA.status_update.fire(ProxyStatus.ONLINE);
    });
    const stopDeviceB = jest.fn(() => {
      deviceB.status = ProxyStatus.ONLINE;
      deviceB.status_update.fire(ProxyStatus.ONLINE);
    });

    jest
      .spyOn(deviceA, 'addMonitor')
      .mockReturnValueOnce(stopDeviceA1)
      .mockReturnValueOnce(stopDeviceA2);
    jest.spyOn(deviceB, 'addMonitor').mockReturnValue(stopDeviceB);

    const proxyA1 = new PropertyProxy(deviceA, 'speed');
    const proxyA2 = new PropertyProxy(deviceA, 'position');
    const proxyB = new PropertyProxy(deviceB, 'temperature');

    const entries: PropertyProxyEntries = [proxyA1, proxyA2, proxyB];

    const onDeviceUpdate = jest.fn();
    const onProxyUpdate = jest.fn();
    const owner = {};

    const stopMonitoring = startMonitoring(
      entries,
      owner,
      onDeviceUpdate,
      onProxyUpdate
    );

    expect(deviceA.addMonitor).toHaveBeenCalledTimes(2);
    expect(deviceB.addMonitor).toHaveBeenCalledTimes(1);

    deviceB.status = ProxyStatus.MONITORING;
    deviceB.status_update.fire(ProxyStatus.MONITORING);
    expect(onDeviceUpdate).toHaveBeenCalledWith('DEVICE_B');

    proxyA2.config_update.fire(proxyA2);
    expect(onProxyUpdate).toHaveBeenCalledWith(1, proxyA2);

    onDeviceUpdate.mockClear();
    stopMonitoring();

    expect(stopDeviceA1).toHaveBeenCalledTimes(1);
    expect(stopDeviceA2).toHaveBeenCalledTimes(1);
    expect(stopDeviceB).toHaveBeenCalledTimes(1);
    expect(onDeviceUpdate).not.toHaveBeenCalled();

    disposePropertyProxies(entries);
  });
});
