import { Hash } from "karabo-ts";
import { GuiServerConnector } from "./GuiServerConnector";
import { DeviceSchemaInfo } from "@/karabo_data/DeviceSchemaInfo";
import { deviceSchemaFromHash } from "@/karabo_hash/decoders/device_schema";
import { buildGetDeviceSchemaHash } from "@/karabo_hash/builders/monitoring_device";
import { useDeviceSchemaStore } from "@/store/useDeviceSchemaStore";

type DeviceSchemaHandler = (deviceSchema: DeviceSchemaInfo) => void;

export class DeviceSchemaConnector {
  // #region Singleton
  private constructor() {
    GuiServerConnector.inst.registerHashHandler(
      "deviceSchema",
      this._onDeviceSchema
    );
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

  registerSchemaMonitor(
    deviceId: string,
    deviceSchemaHandler: DeviceSchemaHandler
  ): void {
    if (!this._schemaMonitors.has(deviceId)) {
      // This is the first schema updates handler for the device
      this._schemaMonitors.set(deviceId, new Array<DeviceSchemaHandler>());
    }
    const deviceSchemaMonitors = this._schemaMonitors.get(deviceId);
    deviceSchemaMonitors?.push(deviceSchemaHandler);
  }

  unregisterSchemaMonitor(
    deviceId: string,
    deviceSchemaHandler: DeviceSchemaHandler
  ): void {
    const deviceSchemaMonitors = this._schemaMonitors.get(deviceId);
    const handlerIdx = deviceSchemaMonitors?.findIndex(
      (handler) => handler === deviceSchemaHandler
    );
    if (handlerIdx !== undefined && handlerIdx >= 0) {
      deviceSchemaMonitors?.splice(handlerIdx, 1);
    }
    if (deviceSchemaMonitors?.length === 0) {
      // The last schema update handler for the device has been removed. Remove the map entry.
      this._schemaMonitors.delete(deviceId);
      // Remove schema from store
      useDeviceSchemaStore.getState().removeDeviceSchema(deviceId);
    }
  }

  // #endregion

  // #region Device Schema Requests

  requestDeviceSchema = (deviceId: string): void => {
    const hash = buildGetDeviceSchemaHash(deviceId);
    GuiServerConnector.inst.sendHash(hash);
  };

  /**
   * Get device schema from store.
   * Returns schema with deviceId and propertyDescriptors map.
   */
  getDeviceSchema = (deviceId: string): DeviceSchemaInfo | undefined => {
    const propertyDescriptors = useDeviceSchemaStore.getState().getDeviceSchema(deviceId);

    if (!propertyDescriptors) {
      return undefined;
    }

    return {
      deviceId,
      propertyDescriptors,
    };
  };

  // #endregion

  /**
   * Handler for "deviceSchema" messages received from the GUI Server.
   * Stores schema in DeviceSchemaStore and dispatches to registered monitors.
   */
  private _onDeviceSchema = (hash: Hash): void => {
    // Decode the hash into the appropriate SchemaInfo data structure
    const deviceSchemaInfo = deviceSchemaFromHash(hash);

    const deviceId = deviceSchemaInfo.deviceId;

    // Dispatch the SchemaInfo to all the registered observers
    const deviceSchemaHandlers = this._schemaMonitors.get(deviceId);
    if (deviceSchemaHandlers !== undefined) {
      // Store schema in DeviceSchemaStore (survives HMR!)
      useDeviceSchemaStore.getState().setDeviceSchema(deviceId, deviceSchemaInfo);

      // Notify all registered schema monitors
      for (const schemaHandler of deviceSchemaHandlers) {
        schemaHandler(deviceSchemaInfo);
      }
    }
  };
}
