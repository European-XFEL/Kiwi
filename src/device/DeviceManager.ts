import { DeviceProxy } from "@/device/device-proxy/DeviceProxy";
import type { DeviceSchemaInfo } from "@/karabo_data/DeviceSchemaInfo";
import type {
  DeviceConfigInfo,
  PropertyInfo,
} from "@/karabo_data/DeviceConfigInfo";
import type { DeviceInfo } from "@/karabo_data/TopologyInfo";
import { HashValueType, VectorElementType } from "@/karabo_hash/HashValueType";
import { Attributes } from "karabo-ts";

type PropertyValueUpdate = HashValueType | VectorElementType[][];

class DeviceManager {
  private static instance: DeviceManager;
  private devices = new Map<string, DeviceProxy>();

  private constructor() {}

  // ──────────────────────────────────────────────────
  // Singleton
  // ──────────────────────────────────────────────────

  static getInstance(): DeviceManager {
    if (!DeviceManager.instance) {
      DeviceManager.instance = new DeviceManager();
    }
    return DeviceManager.instance;
  }

  // ──────────────────────────────────────────────────
  // Basic accessors
  // ──────────────────────────────────────────────────

  /** Get an existing proxy or undefined if not present */
  get(deviceId: string): DeviceProxy | undefined {
    return this.devices.get(deviceId);
  }

  /** Backwards compatible alias */
  getDevice(deviceId: string): DeviceProxy {
    return this.getOrCreate(deviceId);
  }

  /** Get or create an "empty" proxy (no schema/config yet) */
  getOrCreate(deviceId: string): DeviceProxy {
    let proxy = this.devices.get(deviceId);
    if (!proxy) {
      proxy = DeviceProxy.createEmptyDeviceProxy(deviceId);
      this.devices.set(deviceId, proxy);
    }
    return proxy;
  }

  /** All known proxies, e.g. for debugging or lists */
  getAll(): DeviceProxy[] {
    return [...this.devices.values()];
  }

  // ──────────────────────────────────────────────────
  // High-level registrations from backend data
  // ──────────────────────────────────────────────────

  /**
   * Register or update a device from a full snapshot
   * (schema + config + topology).
   */
  registerFromSnapshot(
    schemaInfo: DeviceSchemaInfo,
    configInfo: DeviceConfigInfo,
    deviceInfo: DeviceInfo
  ): DeviceProxy {
    const deviceId = schemaInfo.deviceId ?? configInfo.deviceId;

    let proxy = this.devices.get(deviceId);
    if (!proxy) {
      // First time: build full model & proxy
      proxy = DeviceProxy.fromBackend(schemaInfo, configInfo, deviceInfo);
      this.devices.set(deviceId, proxy);
    } else {
      // Already exists: just update it incrementally
      proxy.applyConfigSnapshot(configInfo);
      proxy.updateTopology(this.mapDeviceInfoToOnline(deviceInfo));
      proxy.markSchemaLoaded();
    }

    return proxy;
  }

  /**
   * Apply a full config snapshot (values + timestamps) for one device.
   */
  applyConfigSnapshot(configInfo: DeviceConfigInfo): void {
    const proxy = this.getOrCreate(configInfo.deviceId);
    proxy.applyConfigSnapshot(configInfo);
  }

  /**
   * Apply a single property update (live value update) for one device.
   */
  applyPropertyUpdate(deviceId: string, property: PropertyInfo): void {
    const proxy = this.getOrCreate(deviceId);
    proxy.applyPropertyUpdate(property);
  }

  /**
   * Apply a topology update (e.g. device online/offline).
   * You'll probably call this from your topology WebSocket handler.
   */
  applyTopologyUpdate(deviceInfo: DeviceInfo): void {
    const proxy = this.getOrCreate(deviceInfo.deviceId);
    proxy.updateTopology(this.mapDeviceInfoToOnline(deviceInfo));
  }

  /**
   * Mark that schema for a device has been requested.
   * Used by DevicePropertyConnector when it calls requestDeviceSchema.
   */
  markSchemaRequested(deviceId: string): void {
    const proxy = this.getOrCreate(deviceId);
    proxy.markSchemaRequested();
  }

  /**
   * Apply schema to a device and mark as loaded.
   * Used by DeviceSchemaConnector.
   */
  applyDeviceSchema(deviceId: string, schemaInfo: import("@/karabo_data/DeviceSchemaInfo").DeviceSchemaInfo): void {
    const proxy = this.getOrCreate(deviceId);
    proxy.applySchema(schemaInfo);
  }

  /**
   * Mark that schema for a device has been loaded/updated.
   * @deprecated Use applyDeviceSchema instead
   */
  markSchemaLoaded(deviceId: string): void {
    const proxy = this.getOrCreate(deviceId);
    proxy.markSchemaLoaded();
  }

  /**
   * Flip "hasConfig" in the proxy.
   */
  setHasConfig(deviceId: string, hasConfig: boolean): void {
    const proxy = this.getOrCreate(deviceId);
    proxy.setHasConfig(hasConfig);
  }

  /**
   * Update online / offline from a boolean.
   * Used by TopologyConnector as the one place that
   * touches device online state.
   */
  setOnlineFlag(deviceId: string, isOnline: boolean): void {
    const proxy = this.getOrCreate(deviceId);
    proxy.updateTopology(isOnline);
  }

  /**
   * Mirror property subscribers into the proxy.
   * Used by DevicePropertyConnector when the first/last
   * UI watcher subscribes/unsubscribes.
   */
  incrementPropertySubscriber(deviceId: string, propertyKey: string): void {
    const proxy = this.getOrCreate(deviceId);
    proxy.incrementPropertySubscriber(propertyKey);
  }

  decrementPropertySubscriber(deviceId: string, propertyKey: string): void {
    const proxy = this.getOrCreate(deviceId);
    proxy.decrementPropertySubscriber(propertyKey);
  }

  /**
   * Report a single property value update into the proxy
   * (for fine-grained reactivity without a full PropertyInfo).
   */
  /** Report a single property value update into the proxy (for fine-grained reactivity) */
  reportPropertyValue(
    deviceId: string,
    propertyKey: string,
    value: PropertyValueUpdate,
    timeAttrs?: Attributes
  ): void {
    const proxy = this.getOrCreate(deviceId);
    proxy.reportPropertyUpdate(propertyKey, value, timeAttrs);
  }

  // ──────────────────────────────────────────────────
  // Destroy / cleanup
  // ──────────────────────────────────────────────────

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

  // ──────────────────────────────────────────────────
  // Internal helpers
  // ──────────────────────────────────────────────────

  /**
   * Map DeviceInfo → online/offline boolean.
   * Adjust this logic if your backend uses a different contract.
   */
  private mapDeviceInfoToOnline(info: DeviceInfo): boolean {
    // If DeviceInfo has a `status` field, use it.
    // Typical contract:
    //   status === "ok"    → online
    //   status === "error" → still online, but in error state
    //   status undefined   → "gone" placeholder from topology
    if (info.status === "ok" || info.status === "error") {
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const deviceManager = DeviceManager.getInstance();
