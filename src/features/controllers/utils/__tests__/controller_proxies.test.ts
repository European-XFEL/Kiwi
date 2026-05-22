import { BindingRoot, DeviceProxy, PropertyProxy } from '@/lib/binding/api';
import { ProxyStatus } from '@/lib/binding/ProxyStatus';
import { SingletonContext } from '@/testing';

import {
  createPropertyProxyContexts,
  createPropertyProxies,
  disposePropertyProxies,
  startMonitoring,
  updateDeviceProxyContexts,
  updatePropertyProxyContext,
  type PropertyProxyEntries,
} from '../controller_proxies';

describe('controller proxy utilities', () => {
  it("creates one property proxy per scene key on that key's own device", async () => {
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
      const entries = createPropertyProxies([
        'DEVICE_A.motor.speed.value',
        'DEVICE_B.temperature',
      ]);

      expect(entries).toHaveLength(2);
      expect(entries[0]).toBeInstanceOf(PropertyProxy);
      expect(entries[0].root.deviceId).toBe('DEVICE_A');
      expect(entries[0].path).toBe('motor.speed.value');

      expect(entries[1]).toBeInstanceOf(PropertyProxy);
      expect(entries[1].root.deviceId).toBe('DEVICE_B');
      expect(entries[1].path).toBe('temperature');

      disposePropertyProxies(entries);
    });
  });

  it('creates property proxy contexts for every proxy slot', () => {
    const deviceA = new DeviceProxy('DEVICE_A');
    deviceA.binding = new BindingRoot();
    const deviceB = new DeviceProxy('DEVICE_B');
    deviceB.binding = new BindingRoot();

    const entries: PropertyProxyEntries = [
      new PropertyProxy(deviceA, 'speed'),
      new PropertyProxy(deviceB, 'temperature'),
    ];
    const contexts = createPropertyProxyContexts(entries);

    expect(contexts).toHaveLength(2);
    expect(contexts[0]).toMatchObject({
      sourceKey: 'DEVICE_A.speed',
      deviceId: 'DEVICE_A',
      propertyPath: 'speed',
      deviceStatus: ProxyStatus.OFFLINE,
    });
    expect(contexts[1]).toMatchObject({
      sourceKey: 'DEVICE_B.temperature',
      deviceId: 'DEVICE_B',
      propertyPath: 'temperature',
      deviceStatus: ProxyStatus.OFFLINE,
    });

    disposePropertyProxies(entries);
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

  it('updateDeviceProxyContexts rebuilds only matching slots and preserves sourceKey', () => {
    const deviceA = new DeviceProxy('DEVICE_A');
    deviceA.binding = new BindingRoot();
    const deviceB = new DeviceProxy('DEVICE_B');
    deviceB.binding = new BindingRoot();

    const proxyA = new PropertyProxy(deviceA, 'speed');
    const proxyB = new PropertyProxy(deviceB, 'temperature');
    const entries: PropertyProxyEntries = [proxyA, proxyB];

    const contexts = createPropertyProxyContexts(entries);

    deviceA.setOnlineFlag(true);
    const next = updateDeviceProxyContexts(contexts, entries, 'DEVICE_A');

    expect(next).not.toBeNull();
    expect(next![0].deviceStatus).toBe(ProxyStatus.ONLINE);
    expect(next![0].sourceKey).toBe('DEVICE_A.speed');
    expect(next![1]).toBe(contexts[1]);

    disposePropertyProxies(entries);
  });

  it('updateDeviceProxyContexts returns null when deviceState and deviceStatus are unchanged', () => {
    const deviceA = new DeviceProxy('DEVICE_A');
    deviceA.binding = new BindingRoot();

    const proxyA = new PropertyProxy(deviceA, 'speed');
    const entries: PropertyProxyEntries = [proxyA];

    const contexts = createPropertyProxyContexts(entries);

    const result = updateDeviceProxyContexts(contexts, entries, 'DEVICE_A');

    expect(result).toBeNull();

    disposePropertyProxies(entries);
  });

  it('updatePropertyProxyContext rewrites only the targeted index slot', () => {
    const deviceA = new DeviceProxy('DEVICE_A');
    deviceA.binding = new BindingRoot();
    const deviceB = new DeviceProxy('DEVICE_B');
    deviceB.binding = new BindingRoot();

    const proxyA = new PropertyProxy(deviceA, 'speed');
    const proxyB = new PropertyProxy(deviceB, 'temperature');
    const entries: PropertyProxyEntries = [proxyA, proxyB];

    const contexts = createPropertyProxyContexts(entries);

    const next = updatePropertyProxyContext(contexts, 0, proxyA);

    expect(next[0]).not.toBe(contexts[0]);
    expect(next[0].sourceKey).toBe('DEVICE_A.speed');
    expect(next[1]).toBe(contexts[1]);

    disposePropertyProxies(entries);
  });
});
