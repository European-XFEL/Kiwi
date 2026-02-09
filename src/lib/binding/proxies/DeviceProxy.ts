import { EventEmitter } from 'events';

import { deviceSchemaFromHash } from '@/karabo_hash/decoders/device_schema';

import type { HashAttributes, HashValues } from '@/karabo-hash/hash';

import { ProxyStatus } from '@/lib/binding/ProxyStatus';
import { Hash, Schema } from '@/karabo-hash/hash';
import type { PropertyModel, ProxyValue } from '../model/types/PropertyType';
import { PropertyBinding } from '../model/PropertyBinding';
import { Timestamp } from '@/lib/binding/utils/timestamps';

import { getNetwork } from '@/singletons/api';
import { flatIterall } from '@/karabo-hash/utils';

export type SchemaChangedPayload = {
  deviceId: string;
  newProperties: string[];
  updatedProperties: string[];
  allChanged: string[];
};

export interface DeviceModel {
  deviceId: String;
  schema: any;
  properties: Map<string, PropertyModel>;
}

export function buildDeviceBinding(deviceId: string): DeviceModel {
  return {
    deviceId,
    schema: {
      properties: [],
    },
    properties: new Map(),
  };
}

export class DeviceProxy extends EventEmitter {
  private _model: DeviceModel;

  // The BindingRoot Namespace
  public binding: any;

  public state: string | undefined = undefined;

  public status: ProxyStatus = ProxyStatus.OFFLINE;

  public deviceId: string = '';
  public serverId: string = '';
  public classId: string = '';

  public isOnline: boolean = false;

  private monitorCount = 0;

  constructor(model: any) {
    super();
    this._model = model;
    this.deviceId = model.deviceId;
    this.setMaxListeners(0);
  }

  static createDeviceProxy(deviceId: string): DeviceProxy {
    const model = buildDeviceBinding(deviceId);
    return new DeviceProxy(model);
  }

  get model(): DeviceModel {
    return this._model;
  }

  // Schema & properties
  get schema() {
    return this._model.schema;
  }

  get properties(): Map<string, PropertyModel> {
    return this._model.properties;
  }

  getProperty(path: string): PropertyModel | undefined {
    return this._model.properties.get(path);
  }

  applyPropertyUpdate(key: string, value: any, attrs: any): void {
    const prop = this._model.properties.get(key);
    if (prop) {
      const timestamp = attrs
        ? Timestamp.fromTimeAttrs(attrs)
        : Timestamp.now();

      prop.binding.setValue(value as ProxyValue, { timestamp });
      prop.binding.timeAttrs = attrs as unknown as
        | Record<string, unknown>
        | undefined;
    }

    if (key === 'state') {
      const oldState = this.state;
      const newState = value;
      if (oldState !== newState) {
        this.state = newState;
        this.emit('state_changed', newState);
      }
    }

    this.emit(
      'property_changed',
      key,
      value as HashValues,
      (prop?.binding.timeAttrs ?? attrs ?? {}) as HashAttributes
    );
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

  public subscribeToSchema(
    callback: (payload: SchemaChangedPayload) => void
  ): () => void {
    const listener = (payload: SchemaChangedPayload) => callback(payload);
    this.on('schema_changed', listener);
    return () => this.off('schema_changed', listener);
  }

  public subscribeToProperty(
    propertyPath: string,
    callback: (value: HashValues, timeAttrs: HashAttributes) => void
  ): () => void {
    const listener = (
      path: string,
      value: HashValues,
      timeAttrs: HashAttributes
    ) => {
      if (path === propertyPath) callback(value, timeAttrs);
    };

    this.on('property_changed', listener);
    return () => this.off('property_changed', listener);
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
      this.monitorCount = Math.max(this.monitorCount - 1, 0);

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
    this.emit('status_changed', this.status);
  }

  destroy(): void {
    this.monitorCount = 0;
    this._stopMonitoringDevice();
    this.removeAllListeners();
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
    const deviceSchemaInfo = deviceSchemaFromHash(schema);
    this._model.schema = {
      properties: Array.from(
        deviceSchemaInfo.propertyDescriptors.entries()
      ).map(([path, schemaAttrs]) => ({ path, schemaAttrs })),
    };

    const newProperties: string[] = [];
    const updatedProperties: string[] = [];

    for (const propSchema of this._model.schema.properties) {
      const existingModel = this._model.properties.get(propSchema.path);

      if (!existingModel) {
        this._model.properties.set(propSchema.path, {
          schema: propSchema,
          binding: new PropertyBinding({
            value: undefined,
            type: undefined,
            timeAttrs: undefined,
          }),
        });
        newProperties.push(propSchema.path);
      } else {
        existingModel.schema = propSchema;
        updatedProperties.push(propSchema.path);
      }
    }

    this._schema_update_fired();

    const allChanged = [...newProperties, ...updatedProperties];

    this.emit('schema_changed', {
      deviceId: this.deviceId,
      newProperties,
      updatedProperties,
      allChanged,
    } satisfies SchemaChangedPayload);
  };
}
