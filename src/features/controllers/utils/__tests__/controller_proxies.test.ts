import { BindingRoot, DeviceProxy, PropertyProxy } from '@/lib/binding/api';
import { ProxyStatus } from '@/lib/binding/ProxyStatus';
import { SingletonContext } from '@/testing';

import {
  createPropertyProxySnapshots,
  createPropertyProxies,
  disposePropertyProxies,
  startMonitoring,
  updateDeviceProxySnapshots,
  updatePropertyProxySnapshot,
  type PropertyProxies,
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
      const proxies = createPropertyProxies([
        'DEVICE_A.motor.speed.value',
        'DEVICE_B.temperature',
      ]);

      expect(proxies).toHaveLength(2);
      expect(proxies[0]).toBeInstanceOf(PropertyProxy);
      expect(proxies[0].root.deviceId).toBe('DEVICE_A');
      expect(proxies[0].path).toBe('motor.speed.value');

      expect(proxies[1]).toBeInstanceOf(PropertyProxy);
      expect(proxies[1].root.deviceId).toBe('DEVICE_B');
      expect(proxies[1].path).toBe('temperature');

      disposePropertyProxies(proxies);
    });
  });

  it('creates property proxy snapshots for every proxy slot', () => {
    const deviceA = new DeviceProxy('DEVICE_A');
    deviceA.binding = new BindingRoot();
    const deviceB = new DeviceProxy('DEVICE_B');
    deviceB.binding = new BindingRoot();

    const proxies: PropertyProxies = [
      new PropertyProxy(deviceA, 'speed'),
      new PropertyProxy(deviceB, 'temperature'),
    ];
    const snapshots = createPropertyProxySnapshots(proxies);

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]).toMatchObject({
      proxy: proxies[0],
      deviceStatus: ProxyStatus.OFFLINE,
    });
    expect(snapshots[1]).toMatchObject({
      proxy: proxies[1],
      deviceStatus: ProxyStatus.OFFLINE,
    });

    disposePropertyProxies(proxies);
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

    const proxies: PropertyProxies = [proxyA1, proxyA2, proxyB];

    const onDeviceUpdate = jest.fn();
    const onProxyUpdate = jest.fn();
    const owner = {};

    const stopMonitoring = startMonitoring(
      proxies,
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

    disposePropertyProxies(proxies);
  });

  it('updateDeviceProxySnapshots rebuilds only matching slots and preserves proxy identity', () => {
    const deviceA = new DeviceProxy('DEVICE_A');
    deviceA.binding = new BindingRoot();
    const deviceB = new DeviceProxy('DEVICE_B');
    deviceB.binding = new BindingRoot();

    const proxyA = new PropertyProxy(deviceA, 'speed');
    const proxyB = new PropertyProxy(deviceB, 'temperature');
    const proxies: PropertyProxies = [proxyA, proxyB];

    const snapshots = createPropertyProxySnapshots(proxies);

    deviceA.setOnlineFlag(true);
    const next = updateDeviceProxySnapshots(snapshots, proxies, 'DEVICE_A');

    expect(next).not.toBeNull();
    expect(next![0].deviceStatus).toBe(ProxyStatus.ONLINE);
    expect(next![0].proxy).toBe(proxyA);
    expect(next![1]).toBe(snapshots[1]);

    disposePropertyProxies(proxies);
  });

  it('updateDeviceProxySnapshots returns null when deviceState and deviceStatus are unchanged', () => {
    const deviceA = new DeviceProxy('DEVICE_A');
    deviceA.binding = new BindingRoot();

    const proxyA = new PropertyProxy(deviceA, 'speed');
    const proxies: PropertyProxies = [proxyA];

    const snapshots = createPropertyProxySnapshots(proxies);

    const result = updateDeviceProxySnapshots(snapshots, proxies, 'DEVICE_A');

    expect(result).toBeNull();

    disposePropertyProxies(proxies);
  });

  it('updatePropertyProxySnapshot rewrites only the targeted index slot', () => {
    const deviceA = new DeviceProxy('DEVICE_A');
    deviceA.binding = new BindingRoot();
    const deviceB = new DeviceProxy('DEVICE_B');
    deviceB.binding = new BindingRoot();

    const proxyA = new PropertyProxy(deviceA, 'speed');
    const proxyB = new PropertyProxy(deviceB, 'temperature');
    const proxies: PropertyProxies = [proxyA, proxyB];

    const snapshots = createPropertyProxySnapshots(proxies);

    const next = updatePropertyProxySnapshot(snapshots, 0, proxyA);

    expect(next[0]).not.toBe(snapshots[0]);
    expect(next[0].proxy).toBe(proxyA);
    expect(next[1]).toBe(snapshots[1]);

    disposePropertyProxies(proxies);
  });
});
