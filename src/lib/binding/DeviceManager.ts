import type {
  DeviceConfigInfo,
  PropertyInfo,
} from '@/karabo_data/DeviceConfigInfo';
import { DeviceProxy } from '@/lib/binding/proxies/DeviceProxy';
import type { DeviceSchemaInfo } from '@/karabo_data/DeviceSchemaInfo';
import type { DeviceInfo } from '@/karabo_data/TopologyInfo';
import { HashTypes } from '@/karabo-hash/typenums';
import { HashAttributes, HashValues } from '@/karabo-hash/hash';
import { SimpleValueTypes } from '@/karabo-hash/types';

type PropertyValueUpdate = HashValues | SimpleValueTypes[][];

class DeviceManager {
  private static instance: DeviceManager;
  private devices = new Map<string, DeviceProxy>();

  private constructor() {}

  static getInstance(): DeviceManager {
    if (!DeviceManager.instance) {
      DeviceManager.instance = new DeviceManager();
    }
    return DeviceManager.instance;
  }

  get(deviceId: string): DeviceProxy | undefined {
    return this.devices.get(deviceId);
  }

  getDevice(deviceId: string): DeviceProxy {
    return this.getOrCreate(deviceId);
  }

  getOrCreate(deviceId: string): DeviceProxy {
    let proxy = this.devices.get(deviceId);
    if (!proxy) {
      proxy = DeviceProxy.createEmptyDeviceProxy(deviceId);
      this.devices.set(deviceId, proxy);
    }
    return proxy;
  }

  getAll(): DeviceProxy[] {
    return [...this.devices.values()];
  }

  registerFromSnapshot(
    schemaInfo: DeviceSchemaInfo,
    configInfo: DeviceConfigInfo,
    deviceInfo: DeviceInfo
  ): DeviceProxy {
    const deviceId = schemaInfo.deviceId ?? configInfo.deviceId;

    let proxy = this.devices.get(deviceId);
    if (!proxy) {
      proxy = DeviceProxy.fromBackend(schemaInfo, configInfo, deviceInfo);
      this.devices.set(deviceId, proxy);
    } else {
      proxy.applyConfigSnapshot(configInfo);
      proxy.updateTopology(this.mapDeviceInfoToOnline(deviceInfo));
      proxy.markSchemaLoaded();
    }

    return proxy;
  }

  applyConfigSnapshot(configInfo: DeviceConfigInfo): void {
    const proxy = this.getOrCreate(configInfo.deviceId);
    proxy.applyConfigSnapshot(configInfo);
  }

  applyPropertyUpdate(deviceId: string, property: PropertyInfo): void {
    const proxy = this.getOrCreate(deviceId);
    proxy.applyPropertyUpdate(property);
  }

  applyTopologyUpdate(deviceInfo: DeviceInfo): void {
    const proxy = this.getOrCreate(deviceInfo.deviceId);
    proxy.updateTopology(this.mapDeviceInfoToOnline(deviceInfo));
  }

  markSchemaRequested(deviceId: string): void {
    const proxy = this.getOrCreate(deviceId);
    proxy.markSchemaRequested();
  }

  applyDeviceSchema(deviceId: string, schemaInfo: DeviceSchemaInfo): void {
    const proxy = this.getOrCreate(deviceId);
    proxy.applySchema(schemaInfo);
  }

  markSchemaLoaded(deviceId: string): void {
    const proxy = this.getOrCreate(deviceId);
    proxy.markSchemaLoaded();
  }

  setHasConfig(deviceId: string, hasConfig: boolean): void {
    const proxy = this.getOrCreate(deviceId);
    proxy.setHasConfig(hasConfig);
  }

  setOnlineFlag(deviceId: string, isOnline: boolean): void {
    const proxy = this.getOrCreate(deviceId);
    proxy.updateTopology(isOnline);
  }

  incrementPropertySubscriber(deviceId: string, propertyKey: string): void {
    const proxy = this.getOrCreate(deviceId);
    proxy.incrementPropertySubscriber(propertyKey);
  }

  decrementPropertySubscriber(deviceId: string, propertyKey: string): void {
    const proxy = this.getOrCreate(deviceId);
    proxy.decrementPropertySubscriber(propertyKey);
  }

  /**
   *report using full PropertyInfoOptional
   * This ensures type/timeAttrs flow through correctly.
   */
  reportPropertyValue(
    deviceId: string,
    propertyKey: string,
    value: PropertyValueUpdate,
    timeAttrs?: HashAttributes,
    type?: HashTypes
  ): void {
    const proxy = this.getOrCreate(deviceId);

    const info: PropertyInfo = {
      key: propertyKey,
      value: value as any,
      type: (type ?? (undefined as any)) as HashTypes,
      timeAttrs: (timeAttrs ?? ({} as any)) as HashAttributes,
    };

    proxy.reportPropertyUpdate(info);
  }

  destroyDevice(deviceId: string): void {
    const proxy = this.devices.get(deviceId);
    if (!proxy) return;

    proxy.destroy();
    this.devices.delete(deviceId);
  }

  destroyAll(): void {
    for (const [id, proxy] of this.devices) {
      proxy.destroy();
      this.devices.delete(id);
    }
  }

  private mapDeviceInfoToOnline(info: DeviceInfo): boolean {
    if (info.status === 'ok' || info.status === 'error') {
      return true;
    }
    return false;
  }
}

export const deviceManager = DeviceManager.getInstance();
