import { Hash, HashTypes, HashValue } from "karabo-ts";
import { GuiServerConnector } from "./GuiServerConnector";
import {
  buildStartMonitoringHash,
  buildStopMonitoringHash,
} from "../karabo_hash/builders/monitoring_device";
import { devicesConfigsFromHash } from "../karabo_hash/decoders/device_config";
import { PropertyInfo } from "@/karabo_data/DeviceConfigInfo";
import { TopologyConnector } from "./TopologyConnector";
import { DeviceSchemaConnector } from "./DeviceSchemaConnector";
import { DeviceInfo, TopologyEventType } from "@/karabo_data/TopologyInfo";
import { DeviceSchemaInfo } from "@/karabo_data/DeviceSchemaInfo";
import { VectorElementType } from "@/karabo_hash/HashValueType";

// VectorElementType[][] is the type used for the value of a table property.
// Each VectorElementType is the value of a table cell with the row being
// the first index and the column being the second index.
type PropertyUpdateHandler = (
  updatedProperty: PropertyInfo | VectorElementType[][]
) => void;

export class DevicePropertyConnector {
  // #region Singleton
  private constructor() {
    GuiServerConnector.inst.registerHashHandler(
      "deviceConfigurations",
      this._onDeviceConfigurations
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

  // #region PropertyMonitors Update Handlers

  /**
   * A map that manages property update handlers for monitored device properties.
   *
   * The map is structured as a two-level mapping:
   * - The first level maps a `deviceId` (string) to a second-level map.
   * - The second-level map maps a `propertyId` (string) to an array of `PropertyUpdateHandler` functions.
   *
   */
  _propertyMonitors = new Map<string, Map<string, PropertyUpdateHandler[]>>();

  registerPropertyMonitor(
    deviceId: string,
    propertyId: string,
    propertyUpdateHandler: PropertyUpdateHandler
  ): void {
    if (!this._propertyMonitors.has(deviceId)) {
      // This is the first property being monitored for the device.
      TopologyConnector.inst.registerDeviceInfoMonitor(
        deviceId,
        this._onDeviceInfoUpdate
      );

      if (TopologyConnector.inst.isDeviceOnline(deviceId)) {
        this._startMonitoringDevice(deviceId);
      } else {
        // For offline devices, registers the pending start monitoring
        this._pendingMonitorStarts.add(deviceId);
      }

      // Creates the map of property update handlers for the device
      this._propertyMonitors.set(
        deviceId,
        new Map<string, PropertyUpdateHandler[]>()
      );
    } else {
      // The device already has at least one registered property monitor
      if (!this._pendingMonitorStarts.has(deviceId)) {
        // The device and its already being monitored. As a startMonitoring request
        // will not be sent to the GUI Server, send a property update immediately.
        // If there's still no configuration available for the device, it
        // can be assumed that it will come soon as there's no pendency to start monitoring
        // the device.
        const propertyInfo = this._getDeviceProperty(deviceId, propertyId);
        if (propertyInfo) {
          this._dispatchPropUpdate(
            deviceId,
            propertyUpdateHandler,
            propertyInfo
          );
        }
      }
    }
    const devicePropertyMonitors = this._propertyMonitors.get(deviceId);
    if (!devicePropertyMonitors?.has(propertyId)) {
      // There's still no update handler registered for the specific property
      // of the device. Creates the list to store the device property handlers.
      devicePropertyMonitors?.set(
        propertyId,
        new Array<PropertyUpdateHandler>()
      );
    }
    devicePropertyMonitors?.get(propertyId)?.push(propertyUpdateHandler);
  }

  unregisterPropertyMonitor(
    deviceId: string,
    propertyId: string,
    propertyUpdatehandler: PropertyUpdateHandler
  ): void {
    const propertyMonitors = this._propertyMonitors
      .get(deviceId)
      ?.get(propertyId);
    const handlerIdx = propertyMonitors?.findIndex(
      (handler) => handler === propertyUpdatehandler
    );
    if (handlerIdx !== undefined && handlerIdx >= 0) {
      propertyMonitors?.splice(handlerIdx, 1);
    }
    if (propertyMonitors?.length === 0) {
      // Removed the last update handler for the device property - clear
      // also the second-level map entry for the property.
      this._propertyMonitors.get(deviceId)?.delete(propertyId);
      if (this._propertyMonitors.get(deviceId)?.keys.length === 0) {
        // Removed the last update handler for any property of the device
        TopologyConnector.inst.unregisterDeviceInfoMonitor(
          deviceId,
          this._onDeviceInfoUpdate
        );
        this._stopMonitoringDevice(deviceId);
        this._propertyMonitors.delete(deviceId);
        this._deviceConfigurations.delete(deviceId);
        this._pendingMonitorStarts.delete(deviceId);
      }
    }
  }

  private _startMonitoringDevice = (deviceId: string): void => {
    DeviceSchemaConnector.inst.registerSchemaMonitor(
      deviceId,
      this._onDeviceSchemaUpdate
    );
    DeviceSchemaConnector.inst.requestDeviceSchema(deviceId);
    const hash = buildStartMonitoringHash(deviceId);
    GuiServerConnector.inst.sendHash(hash);
  };

  private _stopMonitoringDevice = (deviceId: string): void => {
    const hash = buildStopMonitoringHash(deviceId);
    GuiServerConnector.inst.sendHash(hash);
    DeviceSchemaConnector.inst.unregisterSchemaMonitor(
      deviceId,
      this._onDeviceSchemaUpdate
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _onDeviceSchemaUpdate = (_deviceSchema: DeviceSchemaInfo) => {
    // TODO: for all the subscribed slots and other special nodes types, generate
    //       a property update event with the PropertyInfo updated with the
    //       current schema values. This will allow scene widgets to just monitor
    //       slots and other special node types without having to monitor the whole
    //       device schema.
  };

  // #endregion

  // #region Monitoring Start Pendencies

  private _pendingMonitorStarts = new Set<string>();

  private _onDeviceInfoUpdate = (
    eventType: TopologyEventType,
    deviceInfo: DeviceInfo
  ): void => {
    if (
      eventType === TopologyEventType.NEW &&
      this._pendingMonitorStarts.has(deviceInfo.deviceId)
    ) {
      // A device with pending start monitoring became online
      this._startMonitoringDevice(deviceInfo.deviceId);
      this._pendingMonitorStarts.delete(deviceInfo.deviceId);
    } else if (
      eventType === TopologyEventType.GONE &&
      this._propertyMonitors.has(deviceInfo.deviceId)
    ) {
      // A device being monitored became offline - keep track of it as a
      // device with a pending start monitoring. It will either start monitoring
      // when the device becomes online or have its pending monitoring status
      // cleared if all the registered monitors unregister
      this._pendingMonitorStarts.add(deviceInfo.deviceId);
      // NOTE: no need to send a stop monitoring request to the GUI Server as it
      //       automatically removes the monitoring subscription when it detects
      //       that the monitored device goes offline.
    }
  };

  // #endregion

  // #region Device Configuration Storage

  private _deviceConfigurations = new Map<string, PropertyInfo[]>();

  private _getDeviceProperty = (
    deviceId: string,
    propertyId: string
  ): PropertyInfo | undefined => {
    let propertyInfo: PropertyInfo | undefined = undefined;
    if (this._deviceConfigurations.has(deviceId)) {
      const propertyInfoIdx = this._deviceConfigurations
        .get(deviceId)!
        .findIndex(
          (propertyInfo: PropertyInfo) => propertyInfo.key === propertyId
        );
      if (propertyInfoIdx >= 0) {
        propertyInfo =
          this._deviceConfigurations.get(deviceId)![propertyInfoIdx];
      }
    }
    return propertyInfo;
  };

  /**
   * Merges a given list of properties into the currently stored device configuration
   * following the current device schema.
   *
   * @param deviceId the device whose configuration will be merged
   * @param properties the list of properties to be merged in the device configuration
   */
  private _mergeConfiguration = (
    deviceId: string,
    properties: PropertyInfo[]
  ): void => {
    const schema = DeviceSchemaConnector.inst.getDeviceSchema(deviceId);
    const currentProperties = this._deviceConfigurations.get(deviceId) ?? [];
    if (schema === undefined) {
      console.warn(
        `Merging configuration for device "${deviceId}" whose schema is not yet known!`
      );
      const newPropertiesKeys = new Set(properties.map((p) => p.key));
      const propertiesToKeep = currentProperties.filter(
        (p) => !newPropertiesKeys.has(p.key)
      );
      this._deviceConfigurations.set(deviceId, [
        ...propertiesToKeep,
        ...properties,
      ]);
    } else {
      // Device schema is known
      const mergedProperties: PropertyInfo[] = [];
      for (const propertyKey of schema.propertyDescriptors.keys()) {
        const propertyIndex = properties.findIndex(
          (propertyInfo: PropertyInfo) => propertyInfo.key === propertyKey
        );
        if (propertyIndex >= 0) {
          // Schema property found in the new set of properties; use it
          mergedProperties.push(properties[propertyIndex]);
          continue;
        }
        const existingPropertyIndex = currentProperties.findIndex(
          (propertyInfo: PropertyInfo) => propertyInfo.key === propertyKey
        );
        if (existingPropertyIndex >= 0) {
          // Schema property found in the current set of properties; use it
          mergedProperties.push(currentProperties[existingPropertyIndex]);
        }
      }
      this._deviceConfigurations.set(deviceId, mergedProperties);
    }
  };

  // #endregion

  private _dispatchPropUpdate = (
    deviceId: string,
    propUpdateHandler: PropertyUpdateHandler,
    propInfo: PropertyInfo
  ): void => {
    propInfo.schemaAttrs = DeviceSchemaConnector.inst
      .getDeviceSchema(deviceId)
      ?.propertyDescriptors.get(propInfo.key);
    propUpdateHandler(propInfo);
  };

  /**
   * Handler for "deviceConfigurations" messages received from the GUI Server.
   * Updates stored configurations of monitored devices and dispatches updates
   * to registered property monitors.
   */
  private _onDeviceConfigurations = (hash: Hash): void => {
    const devicesConfigs = devicesConfigsFromHash(hash);
    for (const deviceConfig of devicesConfigs) {
      const deviceId = deviceConfig.deviceId;
      if (this._propertyMonitors.has(deviceId)) {
        // There's at least one property update handler registered for the device
        this._mergeConfiguration(deviceId, deviceConfig.properties);
        for (const propInfo of deviceConfig.properties) {
          if (this._propertyMonitors.get(deviceId)?.has(propInfo.key)) {
            // Multiple update handlers for the same property of the same device can exist
            const propUpdateHandlers = this._propertyMonitors
              .get(deviceId)
              ?.get(propInfo.key);
            if (propUpdateHandlers !== undefined) {
              if (propInfo.type === HashTypes.VectorHash) {
                const tableCells = this._extractCellValues(propInfo);
                for (const propUpdateHandler of propUpdateHandlers) {
                  propUpdateHandler(tableCells);
                }
              } else {
                for (const propUpdateHandler of propUpdateHandlers) {
                  this._dispatchPropUpdate(
                    deviceId,
                    propUpdateHandler,
                    propInfo
                  );
                }
              }
            }
          }
        }
      }
    }
  };

  /**
   * Extract cell values for a table property from its PropertyInfo record.
   *
   * @param propInfo table PropertyInfo with table cell values, types and attrs
   * @returns a bidimensional array containing the values of the table cells
   */
  private _extractCellValues = (
    propInfo: PropertyInfo
  ): VectorElementType[][] => {
    const tableCells: VectorElementType[][] = [];
    const hashVector = propInfo.value as HashValue[];
    for (let row = 0; row < hashVector.length; row++) {
      const rowCells: VectorElementType[] = [];
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const [_, hashNode] of Object.entries(hashVector[row])) {
        rowCells.push(hashNode.value.value_ as VectorElementType);
      }
      tableCells.push(rowCells);
    }
    return tableCells;
  };
}
