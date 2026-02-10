import { ProxyStatus } from '@/lib/binding/ProxyStatus';
import { Hash, Schema } from '@/karabo-hash/hash';
import { Timestamp as KaraboTimestamp } from '@/karabo-hash/timestamp';
import { buildBinding } from '@/lib/binding/BindingFactory';

import { getNetwork } from '@/singletons/api';
import { flatIterall } from '@/karabo-hash/utils';
import { BaseBinding, BindingRoot } from './BaseBinding';
import { WeakEvent } from './WeakEvent';

export class DeviceProxy {
  public binding: BindingRoot = new BindingRoot();
  public state: string | undefined = undefined;

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

  getBinding(path: string): BaseBinding | undefined {
    return this.binding.getBinding(path);
  }

  applyPropertyUpdate(key: string, value: any, attrs: any): void {
    const binding = this.binding.getBinding(key);
    if (binding) {
      binding.setValue(value, KaraboTimestamp.fromHashAttributes(attrs));
    }
    if (key === 'state') {
      const oldState = this.state;
      const newState = value;
      if (oldState !== newState) {
        this.state = newState;
        this.state_update.fire(newState);
      }
    }
  }

  public setOnlineFlag(isOnline: boolean): void {
    this.isOnline = isOnline;
    this.status = isOnline ? ProxyStatus.ONLINE : ProxyStatus.OFFLINE;
    this.fireStatusUpdate();

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

    this.fireStatusUpdate();

    return () => {
      this.monitorCount -= 1;

      if (this.monitorCount === 0) {
        this._stopMonitoringDevice();
      }

      this.fireStatusUpdate();
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
      this.status = ProxyStatus.ONLINE;
      this.fireStatusUpdate();
    }
  }

  private _config_update_fired(): void {
    if (this.status === ProxyStatus.SCHEMA) {
      this.status = ProxyStatus.ALIVE;
      this.fireStatusUpdate();
    }
    if (this.status === ProxyStatus.ALIVE && this.monitorCount > 0) {
      this.status = ProxyStatus.MONITORING;
      this.fireStatusUpdate();
    }
  }

  private _schema_update_fired(): void {
    this.schema_update.fire();
    if (this.status === ProxyStatus.ONLINEREQUESTED) {
      if (this.monitorCount > 0) {
        this._startMonitoringDevice();
      }
      this.status = ProxyStatus.SCHEMA;
      this.fireStatusUpdate();
    } else if (
      this.status === ProxyStatus.ALIVE ||
      this.status === ProxyStatus.MONITORING
    ) {
      getNetwork().onGetDeviceConfiguration(this.deviceId);
    }
  }

  public handleDeviceConfiguration(config: Hash): void {
    for (const [key, value, attrs] of flatIterall(config)) {
      this.applyPropertyUpdate(key, value.value_, attrs);
    }
    this._config_update_fired();
  }

  private fireStatusUpdate(): void {
    this.status_update.fire(this.status);
  }

  destroy(): void {
    this.monitorCount = 0;
    this._stopMonitoringDevice();
  }

  public refreshDeviceSchema(): void {
    // Only “request schema” once per in-flight request
    if (this.status !== ProxyStatus.ONLINEREQUESTED) {
      this.status = ProxyStatus.ONLINEREQUESTED;
      getNetwork().onGetDeviceSchema(this.deviceId);
      this.fireStatusUpdate();
    }
  }
  public handleDeviceSchema = (schema: Schema): void => {
    // rebuild device-level binding
    this.binding = buildBinding(schema, this.binding);

    this._schema_update_fired();
  };
}
