import { Hash } from "karabo-ts";
import { GuiServerConnector } from "./GuiServerConnector";
import {
  buildStartMonitoringHash,
  buildStopMonitoringHash,
} from "./karabo_hash/builders/monitoring_device";
import { devicesConfigsFromHash } from "./karabo_hash/decoders/device_config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PropertyUpdateHandler = (updatedValue: any) => void;

export class DevicePropertyConnector {
  // #region Singleton
  private constructor() {
    GuiServerConnector.inst.registerHashHandler(
      "deviceConfigurations",
      this.#_onDeviceConfigurations,
    );
  }

  static #_inst?: DevicePropertyConnector;
  static get inst(): DevicePropertyConnector {
    if (!DevicePropertyConnector.#_inst) {
      DevicePropertyConnector.#_inst = new DevicePropertyConnector();
    }
    return DevicePropertyConnector.#_inst;
  }
  // #endregion

  // #region Bookkeeping of PropertyMonitors
  #_propertyMonitors = new Map<string, Map<string, PropertyUpdateHandler[]>>();

  registerPropertyMonitor(
    deviceId: string,
    propertyId: string,
    propertyUpdateHandler: PropertyUpdateHandler,
  ): void {
    if (!this.#_propertyMonitors.has(deviceId)) {
      // This is the first property being monitored for the device.

      // Instruct the GUI Server to start monitoring the device.
      const hash = buildStartMonitoringHash(deviceId);
      GuiServerConnector.inst.sendHash(hash);

      // Creates the map of property update handlers for the device
      this.#_propertyMonitors.set(
        deviceId,
        new Map<string, PropertyUpdateHandler[]>(),
      );
    }
    const devicePropertyMonitors = this.#_propertyMonitors.get(deviceId);
    if (!devicePropertyMonitors?.has(propertyId)) {
      // There's still no update handler registered for the specific property
      // of the device. Creates the list to store the device property handlers.
      devicePropertyMonitors?.set(
        propertyId,
        new Array<PropertyUpdateHandler>(),
      );
    }
    devicePropertyMonitors?.get(propertyId)?.push(propertyUpdateHandler);
  }

  unregisterPropertyMonitor(
    deviceId: string,
    propertyId: string,
    propertyUpdatehandler: PropertyUpdateHandler,
  ): void {
    const propertyMonitors = this.#_propertyMonitors
      .get(deviceId)
      ?.get(propertyId);
    const handlerIdx = propertyMonitors?.findIndex(
      (handler) => handler === propertyUpdatehandler,
    );
    if (handlerIdx !== undefined && handlerIdx >= 0) {
      propertyMonitors?.splice(handlerIdx, 1);
    }
    if (propertyMonitors?.length === 0) {
      // Removed the last update handler for the device property - clear
      // also the second-level map entry for the property.
      this.#_propertyMonitors.get(deviceId)?.delete(propertyId);
      if (this.#_propertyMonitors.get(deviceId)?.keys.length === 0) {
        // Removed the last update handler for any property of the device -
        // clear also the first-level entry for the device and instruct the
        // GUI Server to stop monitoring the device.
        this.#_propertyMonitors.delete(deviceId);
        const hash = buildStopMonitoringHash(deviceId);
        GuiServerConnector.inst.sendHash(hash);
      }
    }
  }

  // #endregion

  // Handler for DeviceConfigurations messages received from the GUI Server
  #_onDeviceConfigurations = (hash: Hash): void => {
    const devicesConfigs = devicesConfigsFromHash(hash);
    for (const deviceConfig of devicesConfigs) {
      const deviceId = deviceConfig.deviceId;
      if (this.#_propertyMonitors.has(deviceId)) {
        // There's at least of property update handler registered for the device
        for (const propInfo of deviceConfig.properties) {
          if (this.#_propertyMonitors.get(deviceId)?.has(propInfo.propertyId)) {
            // Multiple update handlers for the same property of the same device can exist
            const propUpdateHandlers = this.#_propertyMonitors
              .get(deviceId)
              ?.get(propInfo.propertyId);
            if (propUpdateHandlers !== undefined) {
              for (const propUpdateHandler of propUpdateHandlers) {
                propUpdateHandler(propInfo.propertyValue);
              }
            }
          }
        }
      }
    }
  };
}
