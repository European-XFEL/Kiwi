import { ProxyStatus } from './ProxyStatus';
import { Hash, Schema, Timestamp } from '@/karabo/data/api';
import { buildBinding } from './BindingFactory';

import { getNetwork } from '@/lib/singletons/api';
import { BaseBinding, BindingRoot, NodeBinding } from './BaseBinding';
import { Signal } from '../utils';

export function applyConfiguration(
  config: Hash,
  binding: any,
  timestamp?: Timestamp
) {
  const namespace = binding.value;
  for (const [key, value, attrs] of config.iterall()) {
    if (!namespace.has(key)) {
      continue;
    }

    const binding = namespace.get(key);
    if (value instanceof Hash && binding instanceof NodeBinding) {
      applyConfiguration(value, binding, timestamp);
    } else {
      // Set the timestamp no matter what, and take raw value
      const ts = timestamp ?? Timestamp.fromHashAttributes(attrs);
      binding.setValue(value, ts);
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
  private currentRootRevision = 0;

  private pipeline_subscriptions = new Map<string, number>();

  config_update = new Signal<[]>();
  schema_update = new Signal<[]>();
  state_update = new Signal<[string | undefined]>();
  status_update = new Signal<[string]>();

  constructor(deviceId: string) {
    this.deviceId = deviceId;
  }

  public get rootRevision(): number {
    return this.currentRootRevision;
  }

  private onRootUpdated(): void {
    this.currentRootRevision += 1;
  }

  static createDeviceProxy(deviceId: string): DeviceProxy {
    return new DeviceProxy(deviceId);
  }
  public get state(): string | undefined {
    return this.getBinding('state')?.value?.value_ as string | undefined;
  }

  getBinding(path: string): BaseBinding | undefined {
    return this.binding.getBinding(path);
  }

  private updateStatus(newStatus: ProxyStatus): void {
    const oldStatus = this.status;
    if (oldStatus !== newStatus) {
      this.status = newStatus;
      this.onRootUpdated();
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
    return this.schema_update.subscribe(this, callback);
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
    return () => this.removeMonitor();
  }

  public removeMonitor(): void {
    this.monitorCount -= 1;
    if (this.monitorCount === 0) {
      this._stopMonitoringDevice();
    }
  }

  public connectPipeline(path: string): void {
    // Ask the GUI server to subscribe to a pipeline output
    if (!this.pipeline_subscriptions.has(path)) {
      console.log('Subscribing to pipeline data', this.deviceId, path);
      getNetwork().onSubscribeToOutput(this.deviceId, path, true);
    }
    // We fill a counter object with the path, as we might be
    // interested in multiple values from an output channel
    this.pipeline_subscriptions.set(
      path,
      (this.pipeline_subscriptions.get(path) ?? 0) + 1
    );
  }

  disconnectPipeline(path: string): void {
    // Ask the GUI server to unsubscribe from a pipeline output
    if (!this.pipeline_subscriptions.has(path)) {
      throw new Error(`Expected pipeline subscription for path: ${path}`);
    }

    const count = (this.pipeline_subscriptions.get(path) ?? 0) - 1;
    this.pipeline_subscriptions.set(path, count);

    // Only if we fully removed all interested properties
    // do we unsubscribe from the output channel
    if (count === 0) {
      console.log('Unsubscribing pipeline data', this.deviceId, path);
      this.pipeline_subscriptions.delete(path);
      getNetwork().onSubscribeToOutput(this.deviceId, path, false);
    }
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
      this.onRootUpdated();
      this.state_update.fire(this.state);
    }
    this._config_update_fired();
  }

  destroy(): void {
    this.monitorCount = 0;
    this._stopMonitoringDevice();
  }

  public requestNetwork(path: string): void {
    if (this.pipeline_subscriptions.has(path)) {
      getNetwork().onRequestNetwork(this.deviceId + ':' + path);
    }
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
