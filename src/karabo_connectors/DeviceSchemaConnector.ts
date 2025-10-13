import { Hash } from "karabo-ts";
import { GuiServerConnector } from "./GuiServerConnector";
import { DeviceSchemaInfo } from "@/karabo_data/DeviceSchemaInfo";
import { buildGetDeviceSchemaHash } from "@/karabo_hash/builders/monitoring_device";
import { deviceSchemaFromHash } from "@/karabo_hash/decoders/device_schema";

type DeviceSchemaHandler = (deviceSchema: DeviceSchemaInfo) => void;

export class DeviceSchemaConnector {
  // #region Singleton
  private constructor() {
    GuiServerConnector.inst.registerHashHandler(
      "deviceSchema",
      this.#_onDeviceSchema
    );
  }

  static #_inst?: DeviceSchemaConnector;
  static get inst(): DeviceSchemaConnector {
    if (!DeviceSchemaConnector.#_inst) {
      DeviceSchemaConnector.#_inst = new DeviceSchemaConnector();
    }
    return DeviceSchemaConnector.#_inst;
  }
  // #endregion

  // #region Management of Schema Monitors

  /** Map with deviceIds as keys and handlers of device schema updates for the deviceId as values */
  #_schemaMonitors = new Map<string, DeviceSchemaHandler[]>();

  registerSchemaMonitor(
    deviceId: string,
    deviceSchemaHandler: DeviceSchemaHandler
  ): void {
    if (!this.#_schemaMonitors.has(deviceId)) {
      // This is the first schema updates handler for the device
      this.#_schemaMonitors.set(deviceId, new Array<DeviceSchemaHandler>());
    }
    const deviceSchemaMonitors = this.#_schemaMonitors.get(deviceId);
    deviceSchemaMonitors?.push(deviceSchemaHandler);
    // Immediately dispatches a request to get the schema for the device
    const hash = buildGetDeviceSchemaHash(deviceId);
    GuiServerConnector.inst.sendHash(hash);
  }

  unregisterSchemaMonitor(
    deviceId: string,
    deviceSchemaHandler: DeviceSchemaHandler
  ): void {
    const deviceSchemaMonitors = this.#_schemaMonitors.get(deviceId);
    const handlerIdx = deviceSchemaMonitors?.findIndex(
      (handler) => handler === deviceSchemaHandler
    );
    if (handlerIdx !== undefined && handlerIdx >= 0) {
      deviceSchemaMonitors?.splice(handlerIdx, 1);
    }
    if (deviceSchemaMonitors?.length === 0) {
      // The last schema update handler for the device has been removed. Remove the map entry.
      this.#_schemaMonitors.delete(deviceId);
    }
    // No need to unregister with the GUI Server as device schema updates are immediately
    // registered for monitoring by GUI Server by using the DeviceClient whenever a device
    // is detected as online.
  }

  // #endregion

  /** Handler for "deviceSchema" messages received from the GUI Server */
  #_onDeviceSchema = (hash: Hash): void => {
    // Decode the hash into the appropriate SchemaInfo data structure
    const deviceSchemaInfo = deviceSchemaFromHash(hash);

    // Dispatch the SchemaInfo to all the registered observers of schema
    // updates for the device whose schema has been updated
    const deviceId = deviceSchemaInfo.deviceId;
    const deviceSchemaHandlers = this.#_schemaMonitors.get(deviceId);
    if (deviceSchemaHandlers !== undefined) {
      for (const schemaHandler of deviceSchemaHandlers) {
        schemaHandler(deviceSchemaInfo);
      }
    }
  };
}
