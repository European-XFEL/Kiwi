import { Hash } from 'karabo-ts';
import { getNetwork, getManager } from '@/singletons/api';
import { DeviceSchemaInfo } from '@/karabo_data/DeviceSchemaInfo';
import { deviceSchemaFromHash } from '@/karabo_hash/decoders/device_schema';
import { buildGetDeviceSchemaHash } from '@/karabo_hash/builders/monitoring_device';
import { deviceManager } from '@/binding/DeviceManager';

type DeviceSchemaHandler = (deviceSchema: DeviceSchemaInfo) => void;

// TODO: MOve this to Topology / DeviceProxy
export class DeviceSchemaConnector {
  // #region Singleton
  private constructor() {
    getManager().registerHashHandler('deviceSchema', this._onDeviceSchema);
  }

  private static _inst?: DeviceSchemaConnector;
  static get inst(): DeviceSchemaConnector {
    if (!DeviceSchemaConnector._inst) {
      DeviceSchemaConnector._inst = new DeviceSchemaConnector();
    }
    return DeviceSchemaConnector._inst;
  }
  // #endregion

  // #region Management of Schema Monitors

  /** Map with deviceIds as keys and handlers of device schema updates for the deviceId as values */
  private _schemaMonitors = new Map<string, DeviceSchemaHandler[]>();

  /** Cache of DeviceSchemaInfo objects for seeding new monitors */
  private _schemaCache = new Map<string, DeviceSchemaInfo>();

  registerSchemaMonitor(
    deviceId: string,
    deviceSchemaHandler: DeviceSchemaHandler
  ): void {
    let deviceSchemaMonitors = this._schemaMonitors.get(deviceId);
    if (!deviceSchemaMonitors) {
      // This is the first schema updates handler for the device
      deviceSchemaMonitors = [];
      this._schemaMonitors.set(deviceId, deviceSchemaMonitors);
    }

    deviceSchemaMonitors.push(deviceSchemaHandler);

    // If schema already exists in the store, immediately seed the handler
    const existing = this.getDeviceSchema(deviceId);
    if (existing) {
      deviceSchemaHandler(existing);
    }
  }

  unregisterSchemaMonitor(
    deviceId: string,
    deviceSchemaHandler: DeviceSchemaHandler
  ): void {
    const deviceSchemaMonitors = this._schemaMonitors.get(deviceId);
    if (!deviceSchemaMonitors) return;

    const handlerIdx = deviceSchemaMonitors.findIndex(
      (handler) => handler === deviceSchemaHandler
    );

    if (handlerIdx >= 0) {
      deviceSchemaMonitors.splice(handlerIdx, 1);
    }

    if (deviceSchemaMonitors.length === 0) {
      // The last schema update handler for the device has been removed. Remove the map entry.
      this._schemaMonitors.delete(deviceId);
    }
  }

  /**
   * Get cached DeviceSchemaInfo for a device.
   * Returns undefined if schema hasn't been received yet.
   */
  getDeviceSchema(deviceId: string): DeviceSchemaInfo | undefined {
    return this._schemaCache.get(deviceId);
  }

  // #endregion

  // #region Device Schema Requests

  requestDeviceSchema = (deviceId: string): void => {
    const hash = buildGetDeviceSchemaHash(deviceId);
    getNetwork().sendHash(hash);

    // Mark "schema requested" in DeviceManager / DeviceProxy runtime
    deviceManager.markSchemaRequested(deviceId);
  };

  // #endregion

  /**
   * Handler for "deviceSchema" messages received from the GUI Server.
   * Caches schema and dispatches to registered monitors.
   */
  private _onDeviceSchema = (hash: Hash): void => {
    // Decode the hash into the appropriate SchemaInfo data structure
    const deviceSchemaInfo = deviceSchemaFromHash(hash);
    const deviceId = deviceSchemaInfo.deviceId;

    // 1) Cache the schema for seeding new monitors
    this._schemaCache.set(deviceId, deviceSchemaInfo);

    // 2) Apply schema to DeviceManager (creates PropertyModels)
    deviceManager.applyDeviceSchema(deviceId, deviceSchemaInfo);

    // 3) Dispatch the SchemaInfo to all the registered observers (if any)
    const deviceSchemaHandlers = this._schemaMonitors.get(deviceId);
    if (deviceSchemaHandlers && deviceSchemaHandlers.length > 0) {
      for (const schemaHandler of deviceSchemaHandlers) {
        schemaHandler(deviceSchemaInfo);
      }
    }
  };
}
