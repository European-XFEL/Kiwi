import { EventEmitter } from "@/shared/helpers/EventEmitter";
import type { DeviceModel } from "../device-model/types/DeviceType";
import type { DeviceIndicatorDescriptor } from "@/device/device-proxy/types";
import { DEVICE_INDICATORS } from "@/device/constants/overlay_indicator_constants";

import type { DeviceSchemaInfo } from "@/karabo_data/DeviceSchemaInfo";
import type {
  DeviceConfigInfo,
  PropertyInfo,
  PropertyInfoOptional,
} from "@/karabo_data/DeviceConfigInfo";
import type { DeviceInfo } from "@/karabo_data/TopologyInfo";

import type { HashValueType } from "@/karabo_hash/HashValueType";
import type { Attributes } from "karabo-ts";

import { ProxyStatus } from "@/device/enums";
import {
  buildDeviceModel,
  buildEmptyDeviceModel,
} from "@/device/device-model/builders/DeviceModelBuilder";

import { mapGuiStateColor } from "@/components/shared/helpers/mapStateColor";
import type { GuiStateColorKey } from "@/karabo_data/Indicators";
import type { PropertyModel } from "../device-model/types/PropertyType";

export type SchemaChangedPayload = {
  deviceId: string;
  newProperties: string[];
  updatedProperties: string[];
  allChanged: string[];
};
export type DeviceProxyEventName =
  | "property_changed" // (path, value, timeAttrs?)
  | "schema_changed" // (payload)
  | "state_changed" // (oldState, newState)
  | "status_changed" // (oldStatus, newStatus)
  | "property_subscriber_changed" // (totalSubscribers)
  | "destroyed";

/**
 * High-level proxy for a single device.
 * Wraps DeviceModel + emits events for React / UI.
 */
export class DeviceProxy extends EventEmitter<DeviceProxyEventName> {
  private _model: DeviceModel;

  // Per-property subscription reference counts
  private _propertySubscriptions = new Map<string, number>();

  // Tracks whether a schema has been *requested* but not yet loaded
  private _schemaRequested = false;

  constructor(model: DeviceModel) {
    super();
    this._model = model;
  }

  // ──────────────────────────────────────────────────
  // Factory helpers
  // ──────────────────────────────────────────────────

  /**
   * Convenience constructor: build from raw backend data.
   */
  static fromBackend(
    schemaInfo: DeviceSchemaInfo,
    configInfo: DeviceConfigInfo,
    deviceInfo: DeviceInfo
  ): DeviceProxy {
    const model = buildDeviceModel(schemaInfo, configInfo, deviceInfo);
    return new DeviceProxy(model);
  }

  /**
   * Create an "empty" proxy (no schema / no config yet).
   * Used when we first hear of a device from topology or config.
   */
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

  getPropertyValue(path: string): HashValueType | undefined {
    return this._model.properties.get(path)?.value;
  }

  // Overlay indicators
  getIndicatorDescriptor(): DeviceIndicatorDescriptor | null {
    return DEVICE_INDICATORS.find((d) => d.status === this.proxyStatus) ?? null;
  }

  // ──────────────────────────────────────────────────
  // Backend update hooks
  // (called by DeviceManager / connectors)
  // ──────────────────────────────────────────────────

  /**
   * Apply a single property update from the backend.
   * This is the normal "live update" path when you have a PropertyInfo.
   */
  applyPropertyUpdate(update: PropertyInfo): void {
    const prop = this._model.properties.get(update.key);

    if (prop) {
      prop.value = update.value;
      prop.type = update.type;
      prop.timeAttrs = update.timeAttrs;
      //store full snapshot
      prop.info = update;
    }

    // Always keep runtime.state in sync, even if there is no PropertyModel in the map
    if (update.key === "state" && typeof update.value === "string") {
      const oldState = this._model.runtime.state;
      const newState = update.value;
      if (oldState !== newState) {
        this._model.runtime.state = newState;
        this.emit("state_changed", oldState, newState);
      }
    }

    // Still notify subscribers (e.g. widgets bound to "DEVICE.state")
    this.emit(
      "property_changed",
      update.key,
      update.value as HashValueType,
      (prop?.timeAttrs ?? update.timeAttrs ?? {}) as Attributes
    );
  }

  /**
   * Apply a full config snapshot (e.g. after reconnect / schema refresh).
   * Keeps schema but updates all values & timestamps.
   */
  applyConfigSnapshot(configInfo: DeviceConfigInfo): void {
    for (const update of configInfo.properties) {
      this.applyPropertyUpdate(update);
    }
    this._model.runtime.hasConfig = true;
    this._updateProxyStatus();
  }

  /**
   * Update just the "hasConfig" flag (e.g. from DeviceManager).
   */
  setHasConfig(hasConfig: boolean): void {
    this._model.runtime.hasConfig = hasConfig;
    this._updateProxyStatus();
  }

  /**
   * Update topology status (device online/offline).
   */
  updateTopology(isOnline: boolean): void {
    this._model.runtime.hasReceivedTopology = true;
    this._model.runtime.isOnline = isOnline;
    this._updateProxyStatus();
  }

  /**
   * Mark that schema has been requested from the GUI server,
   * but not yet fully loaded.
   */
  markSchemaRequested(): void {
    this._schemaRequested = true;
    this._updateProxyStatus();
  }

  /**
   * Apply schema to the device - creates/updates PropertyModels.
   *
   * - We emit a dedicated "schema_changed" event.
   * - We do NOT emit "property_changed" for updated schema-only cases.
   * - Optionally we may emit "property_changed" for *new* properties
   *   to keep some backward compatibility.
   */
  applySchema(schemaInfo: DeviceSchemaInfo): void {
    this._model.schema = {
      deviceId: schemaInfo.deviceId,
      properties: Array.from(schemaInfo.propertyDescriptors.entries()).map(
        ([path, schemaAttrs]) => ({
          path,
          schemaAttrs,
        })
      ),
    };

    const newProperties: string[] = [];
    const updatedProperties: string[] = [];

    for (const propSchema of this._model.schema.properties) {
      const existingModel = this._model.properties.get(propSchema.path);

      if (!existingModel) {
        const model: PropertyModel = {
          property_schema: propSchema,
          value: undefined,
          type: undefined,
          timeAttrs: undefined,
          info: undefined,
        };
        this._model.properties.set(propSchema.path, model);
        newProperties.push(propSchema.path);
      } else {
        existingModel.property_schema = propSchema;
        updatedProperties.push(propSchema.path);
      }
    }

    this.markSchemaLoaded();

    const allChanged = [...newProperties, ...updatedProperties];

    this.emit("schema_changed", {
      deviceId: this.deviceId,
      newProperties,
      updatedProperties,
      allChanged,
    } satisfies SchemaChangedPayload);

    // only emit property_changed for NEW properties
    // (keeps older widgets from missing first render)
    for (const path of newProperties) {
      const model = this._model.properties.get(path);
      if (model) {
        this.emit(
          "property_changed",
          path,
          model.value as HashValueType,
          (model.timeAttrs ?? {}) as Attributes
        );
      }
    }
  }

  markSchemaLoaded(): void {
    this._schemaRequested = false;
    this._model.runtime.hasSchema = true;
    this._updateProxyStatus();
  }

  /**
   * Low-level: report a property value change directly.
   *
   * Now expects PropertyInfoOptional for consistency.
   */
  reportPropertyUpdate(info: PropertyInfoOptional): void {
    if (!info) return;

    const { key, value, type, timeAttrs } = info;

    const prop = this._model.properties.get(key);

    if (prop) {
      prop.value = value as HashValueType;
      prop.type = type;
      prop.timeAttrs = timeAttrs;
      prop.info = info;
    }

    if (key === "state" && typeof value === "string") {
      const oldState = this._model.runtime.state;
      const newState = value;

      if (oldState !== newState) {
        this._model.runtime.state = newState;
        this.emit("state_changed", oldState, newState);
      }
    }

    this.emit(
      "property_changed",
      key,
      value as HashValueType,
      (prop?.timeAttrs ?? timeAttrs ?? {}) as Attributes
    );
  }

  /**
   * Subscribe to schema changes.
   */
  subscribeToSchema(
    callback: (payload: SchemaChangedPayload) => void
  ): () => void {
    const listener = (payload: SchemaChangedPayload) => callback(payload);
    this.subscribe("schema_changed", listener);
    return () => this.unsubscribe("schema_changed", listener);
  }

  subscribeToProperty(
    propertyPath: string,
    callback: (value: HashValueType, timeAttrs: Attributes) => void
  ): () => void {
    this._incrementPropertySubscriber(propertyPath);

    const listener = (
      path: string,
      value: HashValueType,
      timeAttrs: Attributes
    ) => {
      if (path === propertyPath) {
        callback(value, timeAttrs);
      }
    };

    this.subscribe("property_changed", listener);

    return () => {
      this.unsubscribe("property_changed", listener);
      this._decrementPropertySubscriber(propertyPath);
    };
  }

  incrementPropertySubscriber(propertyPath: string): void {
    this._incrementPropertySubscriber(propertyPath);
  }

  decrementPropertySubscriber(propertyPath: string): void {
    this._decrementPropertySubscriber(propertyPath);
  }

  private _incrementPropertySubscriber(propertyPath: string): void {
    const prev = this._propertySubscriptions.get(propertyPath) ?? 0;
    this._propertySubscriptions.set(propertyPath, prev + 1);

    this._model.runtime.propertySubscriberCount++;
    this.emit(
      "property_subscriber_changed",
      this._model.runtime.propertySubscriberCount
    );

    this._updateProxyStatus();
  }

  private _decrementPropertySubscriber(propertyPath: string): void {
    const prev = this._propertySubscriptions.get(propertyPath) ?? 0;
    const next = Math.max(prev - 1, 0);

    if (next === 0) {
      this._propertySubscriptions.delete(propertyPath);
    } else {
      this._propertySubscriptions.set(propertyPath, next);
    }

    this._model.runtime.propertySubscriberCount = Math.max(
      this._model.runtime.propertySubscriberCount - 1,
      0
    );
    this.emit(
      "property_subscriber_changed",
      this._model.runtime.propertySubscriberCount
    );

    this._updateProxyStatus();
  }

  private _updateProxyStatus(): void {
    const oldStatus = this._model.runtime.proxyStatus;
    const newStatus = this._computeProxyStatus();

    if (oldStatus !== newStatus) {
      this._model.runtime.proxyStatus = newStatus;
      this.emit("status_changed", oldStatus, newStatus);
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

    if (!r.isOnline) {
      return ProxyStatus.OFFLINE;
    }

    if (this._schemaRequested && !r.hasSchema) {
      return ProxyStatus.SCHEMA_REQUESTED;
    }

    if (r.hasSchema && !r.hasConfig) {
      return ProxyStatus.SCHEMA_RECEIVED;
    }

    if (r.hasSchema && r.hasConfig) {
      return r.propertySubscriberCount > 0
        ? ProxyStatus.MONITORING
        : ProxyStatus.ALIVE;
    }

    return ProxyStatus.ONLINE;
  }

  destroy(): void {
    this._propertySubscriptions.clear();
    this._model.runtime.propertySubscriberCount = 0;
    this.emit("destroyed");
    this.removeAllListeners();
  }
}
