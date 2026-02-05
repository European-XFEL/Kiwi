import { EventEmitter } from '@/lib/binding/utils/EventEmitter';
import type { DeviceModel } from '../model/types/DeviceType';

import type { DeviceSchemaInfo } from '@/karabo_data/DeviceSchemaInfo';
import type { PropertyInfo } from '@/karabo_data/DeviceConfigInfo';

import type { HashAttributes, HashValues } from '@/karabo-hash/hash';
import { Hash } from '@/karabo-hash/hash';
import { HashTypes } from '@/karabo-hash/typenums';
import type { SimpleValueTypes } from '@/karabo-hash/types';
import { buildGetDeviceSchemaHash } from '@/karabo_hash/builders/monitoring_device';

import { ProxyStatus } from '@/lib/binding/ProxyStatus';
import { buildEmptyDeviceModel } from '@/lib/binding/model/builders/DeviceModelBuilder';

import { mapGuiStateColor } from '../utils/mapStateColor';
import type { GuiStateColorKey } from '@/karabo_data/Indicators';
import type { PropertyModel, PropertyValue } from '../model/types/PropertyType';
import { PropertyBinding } from '../model/PropertyBinding';
import { Timestamp } from '@/lib/binding/utils/timestamps';

import { getNetwork } from '@/singletons/api';
import {
  buildStartMonitoringHash,
  buildStopMonitoringHash,
} from '@/karabo_hash/builders/monitoring_device';

export type SchemaChangedPayload = {
  deviceId: string;
  newProperties: string[];
  updatedProperties: string[];
  allChanged: string[];
};

export type DeviceProxyEventName =
  | 'property_changed' // (path, value, timeAttrs?)
  | 'schema_changed' // (payload)
  | 'state_changed' // (oldState, newState)
  | 'status_changed' // (oldStatus, newStatus)
  | 'destroyed';

type PropertyUpdateHandler = (
  updatedProperty: PropertyInfo | SimpleValueTypes[][]
) => void;

export class DeviceProxy extends EventEmitter<DeviceProxyEventName> {
  private _model: DeviceModel;

  // Per-property subscription reference counts
  private monitorCount = new Map<string, number>();

  private _schemaRequested = false;

  /**
   * propertyId -> handlers
   * (Equivalent to: Map<deviceId, Map<propertyId, handlers>> but per-device.)
   */
  private _propertyMonitors = new Map<string, PropertyUpdateHandler[]>();

  private deviceSchema: DeviceSchemaInfo | undefined = undefined;

  /** cached merged config (ordered by schema when available) */
  private _deviceConfigurations: PropertyInfo[] = [];

  /** offline → online restart monitoring pending */
  private _pendingStartMonitoring = false;

  /** whether we have sent startMonitoring to GUI server for current session */
  private _backendMonitoringActive = false;

  constructor(model: DeviceModel) {
    super();
    this._model = model;
  }

  static createEmptyDeviceProxy(deviceId: string): DeviceProxy {
    const emptyModel = buildEmptyDeviceModel(deviceId);
    return new DeviceProxy(emptyModel);
  }

  // ──────────────────────────────────────────────────
  // Public getters
  // ──────────────────────────────────────────────────

  get model(): DeviceModel {
    return this._model;
  }

  // Identity
  get deviceId(): string {
    return this._model.identity.deviceId;
  }

  get classId(): string | undefined {
    return this._model.identity.classId;
  }

  get serverId(): string | undefined {
    return this._model.identity.serverId;
  }

  // Runtime / status
  get proxyStatus(): ProxyStatus {
    return this._model.runtime.proxyStatus;
  }

  get isOnline(): boolean {
    return this._model.runtime.isOnline;
  }

  get hasSchema(): boolean {
    return this._model.runtime.hasSchema;
  }

  get hasConfig(): boolean {
    return this._model.runtime.hasConfig;
  }

  get hasReceivedTopology(): boolean {
    return this._model.runtime.hasReceivedTopology;
  }

  get propertySubscriberCount(): number {
    return this._model.runtime.propertySubscriberCount;
  }

  // Karabo device state (what you map to colors)
  get state(): string | undefined {
    return this._model.runtime.state;
  }

  get stateColor(): GuiStateColorKey | undefined {
    return this.state ? mapGuiStateColor(this.state) : undefined;
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

  /**
   * Apply a single property update from the backend.
   * This is the normal "live update" path when you have a PropertyInfo.
   */
  applyPropertyUpdate(update: PropertyInfo): void {
    const { key, value, timeAttrs } = update;

    const prop = this._model.properties.get(key);
    if (prop) {
      const timestamp = timeAttrs
        ? Timestamp.fromTimeAttrs(timeAttrs)
        : Timestamp.now();

      prop.binding.setValue(value as PropertyValue, { timestamp });

      prop.binding.timeAttrs = timeAttrs as unknown as
        | Record<string, unknown>
        | undefined;
    }

    if (key === 'state' && typeof value === 'string') {
      const oldState = this._model.runtime.state;
      const newState = value;
      if (oldState !== newState) {
        this._model.runtime.state = newState;
        this.emit('state_changed', oldState, newState);
      }
    }

    // Always notify subscribers (widgets bound to "DEVICE.state", etc.)
    this.emit(
      'property_changed',
      key,
      value as HashValues,
      (prop?.binding.timeAttrs ?? timeAttrs ?? {}) as HashAttributes
    );
  }

  setHasConfig(hasConfig: boolean): void {
    if (this._model.runtime.hasConfig === hasConfig) return;
    this._model.runtime.hasConfig = hasConfig;
    this._updateProxyStatus();
  }

  public setOnlineFlag(isOnline: boolean): void {
    const r = this._model.runtime;

    r.hasReceivedTopology = true;

    if (r.isOnline === isOnline) {
      // Still ensure status is up-to-date if other flags changed earlier.
      this._updateProxyStatus();
      return;
    }

    r.isOnline = isOnline;
    this._updateProxyStatus();

    if (isOnline) {
      if (this._pendingStartMonitoring && this._propertyMonitors.size > 0) {
        this._pendingStartMonitoring = false;
        this._ensureMonitoringState();
      }
      return;
    }

    // offline
    if (this._propertyMonitors.size > 0) {
      this._pendingStartMonitoring = true;
      // NOTE: no need to send stop monitoring; GUI server drops it on offline
    }
  }

  /**
   * Mark that schema has been requested from the GUI server,
   * but not yet fully loaded.
   */
  public markSchemaRequested(): void {
    if (this._schemaRequested) return;
    this._schemaRequested = true;
    this._updateProxyStatus();
  }

  /**
   * Apply schema to the device - creates/updates PropertyModels.
   */
  public applySchema(schemaInfo: DeviceSchemaInfo): void {
    this._model.schema = {
      properties: Array.from(schemaInfo.propertyDescriptors.entries()).map(
        ([path, schemaAttrs]) => ({ path, schemaAttrs })
      ),
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

    this.markSchemaLoaded();

    const allChanged = [...newProperties, ...updatedProperties];

    this.emit('schema_changed', {
      deviceId: this.deviceId,
      newProperties,
      updatedProperties,
      allChanged,
    } satisfies SchemaChangedPayload);

    // Back-compat: emit property_changed only for NEW properties
    for (const path of newProperties) {
      const model = this._model.properties.get(path);
      if (!model) continue;

      this.emit(
        'property_changed',
        path,
        model.binding.value as HashValues,
        (model.binding.timeAttrs ?? {}) as unknown as HashAttributes
      );
    }
  }

  private markSchemaLoaded(): void {
    this._schemaRequested = false;
    this._model.runtime.hasSchema = true;
    this._updateProxyStatus();
  }

  /**
   * Subscribe to schema changes.
   */
  public subscribeToSchema(
    callback: (payload: SchemaChangedPayload) => void
  ): () => void {
    const listener = (payload: SchemaChangedPayload) => callback(payload);
    this.subscribe('schema_changed', listener);
    return () => this.unsubscribe('schema_changed', listener);
  }

  public subscribeToProperty(
    propertyPath: string,
    callback: (value: HashValues, timeAttrs: HashAttributes) => void
  ): () => void {
    this._incrementPropertySubscriber(propertyPath);

    const listener = (
      path: string,
      value: HashValues,
      timeAttrs: HashAttributes
    ) => {
      if (path === propertyPath) callback(value, timeAttrs);
    };

    this.subscribe('property_changed', listener);

    return () => {
      this.unsubscribe('property_changed', listener);
      this._decrementPropertySubscriber(propertyPath);
    };
  }

  private _incrementPropertySubscriber(propertyPath: string): void {
    const prev = this.monitorCount.get(propertyPath) ?? 0;
    this.monitorCount.set(propertyPath, prev + 1);

    this._model.runtime.propertySubscriberCount++;
    this._updateProxyStatus();
  }

  private _decrementPropertySubscriber(propertyPath: string): void {
    const prev = this.monitorCount.get(propertyPath) ?? 0;
    const next = Math.max(prev - 1, 0);

    if (next === 0) this.monitorCount.delete(propertyPath);
    else this.monitorCount.set(propertyPath, next);

    this._model.runtime.propertySubscriberCount = Math.max(
      this._model.runtime.propertySubscriberCount - 1,
      0
    );
    this._updateProxyStatus();
  }

  private registerPropertyMonitor(
    propertyId: string,
    propertyUpdateHandler: PropertyUpdateHandler
  ): void {
    const existingHandlers = this._propertyMonitors.get(propertyId);
    const handlers = existingHandlers ?? [];
    const wasEmpty = !existingHandlers || existingHandlers.length === 0;

    if (!existingHandlers) {
      this._propertyMonitors.set(propertyId, handlers);
    } else if (!this._pendingStartMonitoring) {
      // Already monitoring; dispatch immediately if we have a cached value
      const propertyInfo = this._getDeviceProperty(propertyId);
      if (propertyInfo)
        this._dispatchPropUpdate(propertyUpdateHandler, propertyInfo);
    }

    handlers.push(propertyUpdateHandler);

    // First handler for this property => count as subscriber
    if (wasEmpty) this._incrementPropertySubscriber(propertyId);

    this._ensureMonitoringState();
  }

  private unregisterPropertyMonitor(
    propertyId: string,
    propertyUpdateHandler: PropertyUpdateHandler
  ): void {
    const handlers = this._propertyMonitors.get(propertyId);
    if (!handlers) return;

    const idx = handlers.indexOf(propertyUpdateHandler);
    if (idx >= 0) handlers.splice(idx, 1);

    if (handlers.length === 0) {
      this._propertyMonitors.delete(propertyId);
      this._decrementPropertySubscriber(propertyId);
    }

    if (this._propertyMonitors.size === 0) {
      this._stopMonitoringDevice();
      this._deviceConfigurations = [];
      this._pendingStartMonitoring = false;
    }
  }

  public addMonitor(propertyId: string): () => void {
    const noOpHandler: PropertyUpdateHandler = () => {
      // not used in new world; DeviceProxy is updated via applyPropertyUpdate
    };

    this.registerPropertyMonitor(propertyId, noOpHandler);
    return () => this.unregisterPropertyMonitor(propertyId, noOpHandler);
  }

  private _ensureMonitoringState(): void {
    if (this._propertyMonitors.size === 0) return;

    if (!this.isOnline) {
      this._pendingStartMonitoring = true;
      return;
    }

    this._pendingStartMonitoring = false;

    if (!this._backendMonitoringActive) {
      this._startMonitoringDevice();
    }
  }

  /**
   * Start monitoring this device:
   *  - ask GUI server to start monitoring
   */
  private _startMonitoringDevice(): void {
    if (this._backendMonitoringActive) return;

    this.requestDeviceSchema(this.deviceId);

    getNetwork().sendHash(buildStartMonitoringHash(this.deviceId));

    this._backendMonitoringActive = true;
  }

  private _stopMonitoringDevice(): void {
    if (!this._backendMonitoringActive) return;

    getNetwork().sendHash(buildStopMonitoringHash(this.deviceId));
    this._backendMonitoringActive = false;
  }

  private _getDeviceProperty(propertyId: string): PropertyInfo | undefined {
    return this._deviceConfigurations.find((p) => p.key === propertyId);
  }

  private _mergeConfiguration(properties: PropertyInfo[]): void {
    const schema = this.deviceSchema;
    const current = this._deviceConfigurations;

    if (!schema) {
      console.warn(
        `Merging configuration for device "${this.deviceId}" whose schema is not yet known!`
      );

      const incomingKeys = new Set(properties.map((p) => p.key));
      const keep = current.filter((p) => !incomingKeys.has(p.key));
      this._deviceConfigurations = [...keep, ...properties];
      return;
    }

    // Schema-known: preserve schema order and keep last-known values.
    const incomingByKey = new Map(properties.map((p) => [p.key, p] as const));
    const currentByKey = new Map(current.map((p) => [p.key, p] as const));

    const merged: PropertyInfo[] = [];
    for (const key of schema.propertyDescriptors.keys()) {
      const incoming = incomingByKey.get(key);
      if (incoming) merged.push(incoming);
      else {
        const existing = currentByKey.get(key);
        if (existing) merged.push(existing);
      }
    }

    this._deviceConfigurations = merged;
  }

  private _dispatchPropUpdate(
    propUpdateHandler: PropertyUpdateHandler,
    propInfo: PropertyInfo
  ): void {
    propInfo.schemaAttrs = this.getDeviceSchema()?.propertyDescriptors.get(
      propInfo.key
    );

    propUpdateHandler(propInfo);
  }

  private _extractCellValues(propInfo: PropertyInfo): SimpleValueTypes[][] {
    const tableCells: SimpleValueTypes[][] = [];
    const hashVector = propInfo.value as unknown as Hash[];

    for (const rowHash of hashVector) {
      const rowCells: SimpleValueTypes[] = [];
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const [, cellData] of rowHash.items()) {
        rowCells.push(cellData.value_);
      }
      tableCells.push(rowCells);
    }

    return tableCells;
  }

  handleDeviceConfiguration(properties: PropertyInfo[]): void {
    // No one watching this device's properties → ignore
    if (this._propertyMonitors.size === 0) return;

    this._mergeConfiguration(properties);
    this.setHasConfig(true);

    const schema = this.getDeviceSchema();

    for (const propInfo of properties) {
      // Attach schemaAttrs (if available) before sending to handlers or proxy
      propInfo.schemaAttrs = schema?.propertyDescriptors.get(propInfo.key);

      // Keep DeviceProxy model updated with full PropertyInfo
      this.applyPropertyUpdate(propInfo);

      const handlers = this._propertyMonitors.get(propInfo.key);
      if (!handlers?.length) continue;

      // Table property special handling for UI handlers
      if (propInfo.type === HashTypes.VectorHash) {
        const tableCells = this._extractCellValues(propInfo);
        for (const handler of handlers) handler(tableCells);
        continue;
      }

      // Normal scalar/vector properties
      for (const handler of handlers) {
        handler(propInfo);
      }
    }
  }

  private _updateProxyStatus(): void {
    const oldStatus = this._model.runtime.proxyStatus;
    const newStatus = this._computeProxyStatus();

    if (oldStatus !== newStatus) {
      this._model.runtime.proxyStatus = newStatus;
      this.emit('status_changed', oldStatus, newStatus);
    }
  }

  private _computeProxyStatus(): ProxyStatus {
    const r = this._model.runtime;

    if (
      !r.hasReceivedTopology &&
      !r.hasSchema &&
      !r.hasConfig &&
      !this._schemaRequested
    ) {
      return ProxyStatus.UNKNOWN;
    }

    if (!r.isOnline) return ProxyStatus.OFFLINE;
    if (this._schemaRequested && !r.hasSchema)
      return ProxyStatus.SCHEMA_REQUESTED;
    if (r.hasSchema && !r.hasConfig) return ProxyStatus.SCHEMA_RECEIVED;

    if (r.hasSchema && r.hasConfig) {
      return r.propertySubscriberCount > 0
        ? ProxyStatus.MONITORING
        : ProxyStatus.ALIVE;
    }

    return ProxyStatus.ONLINE;
  }

  destroy(): void {
    this.monitorCount.clear();
    this._model.runtime.propertySubscriberCount = 0;

    this._propertyMonitors.clear();
    this._deviceConfigurations = [];
    this._pendingStartMonitoring = false;

    this._stopMonitoringDevice();

    this.emit('destroyed');
    this.removeAllListeners();
  }

  public getDeviceSchema(): DeviceSchemaInfo | undefined {
    return this.deviceSchema;
  }

  public requestDeviceSchema = (deviceId: string): void => {
    const hash = buildGetDeviceSchemaHash(deviceId);
    getNetwork().sendHash(hash);
    this.markSchemaRequested();
  };

  public handleDeviceSchema = (deviceSchemaInfo: DeviceSchemaInfo): void => {
    // Decode the hash into the appropriate SchemaInfo data structure
    this.deviceSchema = deviceSchemaInfo;
    this.applySchema(deviceSchemaInfo);
  };
}
