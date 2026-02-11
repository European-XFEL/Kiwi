import { ProxyStatus } from '@/lib/binding/ProxyStatus';
import { Hash, Schema } from '@/karabo-hash/hash';
import { Timestamp } from '@/karabo-hash/timestamp';
import { buildBinding } from '@/lib/binding/BindingFactory';

import { getNetwork } from '@/singletons/api';
import { BaseBinding, BindingRoot, NodeBinding } from './BaseBinding';
import { WeakEvent } from './WeakEvent';

export function applyConfiguration(config: Hash, binding: any) {
  const namespace = binding.value;
  for (const [key, value, attrs] of config.iterall()) {
    if (!namespace.has(key)) continue;

    const binding = namespace.get(key);
    if (value instanceof Hash && binding instanceof NodeBinding) {
      applyConfiguration(value, binding);
    } else {
      // Set the timestamp no matter what, and take raw value
      binding.setValue(value.value_, Timestamp.fromHashAttributes(attrs));
    }
  }
}

export class DeviceProxy {
  public binding: BindingRoot = new BindingRoot();

  public status: ProxyStatus = ProxyStatus.OFFLINE;

  public deviceId: string = '';
  public serverId: string = '';
  public classId: string = '';

  public isOnline: boolean = false;

  private monitorCount = 0;

  config_update = new WeakEvent();
  schema_update = new WeakEvent();
  state_update = new WeakEvent();
  status_update = new WeakEvent();

  constructor(deviceId: string) {
    this.deviceId = deviceId;
  }

  static createDeviceProxy(deviceId: string): DeviceProxy {
    return new DeviceProxy(deviceId);
  }
  public get state(): string | undefined {
    return this.getBinding('state')?.value as string | undefined;
  }

  getBinding(path: string): BaseBinding | undefined {
    return this.binding.getBinding(path);
  }

  private updateStatus(newStatus: ProxyStatus): void {
    const oldStatus = this.status;
    if (oldStatus !== newStatus) {
      this.status = newStatus;
      this.status_update.fire(newStatus);
    }
  }

  public setOnlineFlag(isOnline: boolean): void {
    this.isOnline = isOnline;
    this.updateStatus(isOnline ? ProxyStatus.ONLINE : ProxyStatus.OFFLINE);

    // If we come online and someone wants monitoring, fetch schema again
    if (isOnline && this.monitorCount > 0) {
      this.refreshDeviceSchema();
    }
  }

  public binding_update(callback: () => void): () => void {
    return this.schema_update.subscribe(callback);
  }

  public addMonitor(): () => void {
    const ignoredStatuses = new Set<ProxyStatus>([
      ProxyStatus.OFFLINE,
      ProxyStatus.ONLINEREQUESTED,
    ]);

    this.monitorCount += 1;

    if (this.monitorCount === 1) {
      if (this.status === ProxyStatus.ONLINE) {
        this.refreshDeviceSchema();
      } else if (!ignoredStatuses.has(this.status)) {
        this._startMonitoringDevice();
      }
    }
    return () => {
      this.monitorCount -= 1;

      if (this.monitorCount === 0) {
        this._stopMonitoringDevice();
      }
    };
  }

  private _startMonitoringDevice(): void {
    getNetwork().onStartMonitoringDevice(this.deviceId);
  }

  private _stopMonitoringDevice(): void {
    getNetwork().onStopMonitoringDevice(this.deviceId);

    if (
      this.status === ProxyStatus.ALIVE ||
      this.status === ProxyStatus.MONITORING
    ) {
      this.updateStatus(ProxyStatus.ONLINE);
    }
  }

  private _config_update_fired(): void {
    if (this.status === ProxyStatus.SCHEMA) {
      this.updateStatus(ProxyStatus.ALIVE);
    }
    if (this.status === ProxyStatus.ALIVE && this.monitorCount > 0) {
      this.updateStatus(ProxyStatus.MONITORING);
    }
  }

  private _schema_update_fired(): void {
    this.schema_update.fire();

    if (this.status === ProxyStatus.ONLINEREQUESTED) {
      if (this.monitorCount > 0) {
        this._startMonitoringDevice();
      }
      this.updateStatus(ProxyStatus.SCHEMA);
    } else if (
      this.status === ProxyStatus.ALIVE ||
      this.status === ProxyStatus.MONITORING
    ) {
      getNetwork().onGetDeviceConfiguration(this.deviceId);
    }
  }

  public handleDeviceConfiguration(config: Hash): void {
    applyConfiguration(config, this.binding);
    if (config.has('state')) {
      this.state_update.fire(this.state);
    }
    this._config_update_fired();
  }

  destroy(): void {
    this.monitorCount = 0;
    this._stopMonitoringDevice();
  }

  public refreshDeviceSchema(): void {
    // Only “request schema” once per in-flight request
    if (this.status !== ProxyStatus.ONLINEREQUESTED) {
      this.updateStatus(ProxyStatus.ONLINEREQUESTED);
      getNetwork().onGetDeviceSchema(this.deviceId);
    }
  }

  public handleDeviceSchema = (schema: Schema): void => {
    // rebuild device-level binding
    this.binding = buildBinding(schema, this.binding);

    this._schema_update_fired();
  };
}
