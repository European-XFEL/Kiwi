import { Hash, HashTypes, HashValue } from 'karabo-ts';
import { getNetwork, getManager, getTopology } from '@/singletons/api';
import {
  buildStartMonitoringHash,
  buildStopMonitoringHash,
} from '@/karabo_hash/builders/monitoring_device';
import { devicesConfigsFromHash } from '@/karabo_hash/decoders/device_config';
import type { PropertyInfo } from '@/karabo_data/DeviceConfigInfo';
import { DeviceSchemaConnector } from './DeviceSchemaConnector';
import { DeviceInfo, TopologyEventType } from '@/karabo_data/TopologyInfo';
import type { DeviceSchemaInfo } from '@/karabo_data/DeviceSchemaInfo';
import type { VectorElementType } from '@/karabo_hash/HashValueType';
import { deviceManager } from '@/lib/binding/DeviceManager';

// VectorElementType[][] is the type used for the value of a table property.
// Each VectorElementType is the value of a table cell with the row being
// the first index and the column being the second index.
type PropertyUpdateHandler = (
  updatedProperty: PropertyInfo | VectorElementType[][]
) => void;

// TODO: Move this fuctionality to Topology / DeviceProxy
export class DevicePropertyConnector {
  // #region Singleton
  private constructor() {
    getManager().registerHashHandler(
      'deviceConfigurations',
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
   * - The second level maps a `propertyId` (string) to an array of `PropertyUpdateHandler` functions.
   */
  private _propertyMonitors = new Map<
    string,
    Map<string, PropertyUpdateHandler[]>
  >();

  registerPropertyMonitor(
    deviceId: string,
    propertyId: string,
    propertyUpdateHandler: PropertyUpdateHandler
  ): void {
    // Ensure proxy exists for this device (creates on-demand)
    deviceManager.getDevice(deviceId);

    // Get or create the property map for this device
    let devicePropertyMonitors = this._propertyMonitors.get(deviceId);

    if (!devicePropertyMonitors) {
      // This is the first property being monitored for the device.
      getTopology().registerDeviceInfoMonitor(
        deviceId,
        this._onDeviceInfoUpdate
      );

      if (getTopology().isDeviceOnline(deviceId)) {
        this._startMonitoringDevice(deviceId);
      } else {
        // For offline devices, register the pending start monitoring
        this._pendingMonitorStarts.add(deviceId);
      }

      devicePropertyMonitors = new Map<string, PropertyUpdateHandler[]>();
      this._propertyMonitors.set(deviceId, devicePropertyMonitors);
    } else {
      // The device already has at least one registered property monitor
      if (!this._pendingMonitorStarts.has(deviceId)) {
        // The device is already being monitored. As a startMonitoring request
        // will not be sent to the GUI Server, send a property update immediately.
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

    // Now register the handler for this specific property
    // At this point, devicePropertyMonitors is guaranteed to be defined
    const existingHandlers = devicePropertyMonitors.get(propertyId);
    const handlers = existingHandlers ?? [];
    const wasEmpty = !existingHandlers || existingHandlers.length === 0;

    if (!existingHandlers) {
      devicePropertyMonitors.set(propertyId, handlers);
    }

    handlers.push(propertyUpdateHandler);

    // FIRST subscription for this (deviceId, propertyId) → increment subscriber count in DeviceManager/DeviceProxy
    if (wasEmpty) {
      deviceManager.incrementPropertySubscriber(deviceId, propertyId);
    }
  }

  unregisterPropertyMonitor(
    deviceId: string,
    propertyId: string,
    propertyUpdateHandler: PropertyUpdateHandler
  ): void {
    const devicePropertyMonitors = this._propertyMonitors.get(deviceId);
    if (!devicePropertyMonitors) {
      return;
    }

    const handlers = devicePropertyMonitors.get(propertyId);
    if (!handlers) {
      return;
    }

    const handlerIdx = handlers.findIndex(
      (handler) => handler === propertyUpdateHandler
    );

    if (handlerIdx >= 0) {
      handlers.splice(handlerIdx, 1);
    }

    if (handlers.length === 0) {
      // Removed the last update handler for this device property
      devicePropertyMonitors.delete(propertyId);

      // Mirror that in the DeviceProxy via DeviceManager
      deviceManager.decrementPropertySubscriber(deviceId, propertyId);
    }

    if (devicePropertyMonitors.size === 0) {
      // Removed the last update handler for any property of the device
      getTopology().unregisterDeviceInfoMonitor(
        deviceId,
        this._onDeviceInfoUpdate
      );
      this._stopMonitoringDevice(deviceId);
      this._propertyMonitors.delete(deviceId);
      this._deviceConfigurations.delete(deviceId);
      this._pendingMonitorStarts.delete(deviceId);
    }
  }

  /**
   * Start monitoring a device:
   *  - register schema monitor
   *  - DeviceSchemaConnector will internally mark schemaRequested and later schemaLoaded via DeviceManager
   *  - ask GUI server to start monitoring
   */
  private _startMonitoringDevice = (deviceId: string): void => {
    DeviceSchemaConnector.inst.registerSchemaMonitor(
      deviceId,
      this._onDeviceSchemaUpdate
    );

    // Ask GUI server for schema + config stream
    // Note: requestDeviceSchema should call DeviceManager.markSchemaRequested internally
    DeviceSchemaConnector.inst.requestDeviceSchema(deviceId);

    const hash = buildStartMonitoringHash(deviceId);
    getNetwork().sendHash(hash);
  };

  private _stopMonitoringDevice = (deviceId: string): void => {
    const hash = buildStopMonitoringHash(deviceId);
    getNetwork().sendHash(hash);
    DeviceSchemaConnector.inst.unregisterSchemaMonitor(
      deviceId,
      this._onDeviceSchemaUpdate
    );
  };

  /**
   * Called whenever DeviceSchemaConnector receives a schema update
   * for a device we are monitoring.
   */
  private _onDeviceSchemaUpdate = (deviceSchema: DeviceSchemaInfo): void => {
    // Note: DeviceSchemaConnector should call DeviceManager.markSchemaLoaded(deviceId)

    // Re-dispatch existing properties with schema attributes attached
    // This ensures permission checks (requiredAccessLevel, accessMode, allowedStates) work correctly
    const deviceId = deviceSchema.deviceId;
    const existingProperties = this._deviceConfigurations.get(deviceId);

    if (existingProperties) {
      for (const propInfo of existingProperties) {
        const propUpdateHandlers = this._propertyMonitors
          .get(deviceId)
          ?.get(propInfo.key);

        if (propUpdateHandlers) {
          for (const propUpdateHandler of propUpdateHandlers) {
            this._dispatchPropUpdate(deviceId, propUpdateHandler, propInfo);
          }
        }
      }
    }
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
      // device with a pending start monitoring.
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
    const list = this._deviceConfigurations.get(deviceId);
    if (!list) return undefined;

    return list.find((p) => p.key === propertyId);
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
    if (!schema) {
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
      return;
    }

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

      if (!this._propertyMonitors.has(deviceId)) {
        // No one is watching this device's properties → just ignore
        continue;
      }

      // 1) Merge into local cache for initial updates
      this._mergeConfiguration(deviceId, deviceConfig.properties);

      // 2) Tell DeviceManager that we have config (idempotent)
      deviceManager.setHasConfig(deviceId, true);

      // 3) Dispatch updates to all property monitors
      for (const propInfo of deviceConfig.properties) {
        // Always attach schemaAttrs before sending to handlers or proxy
        propInfo.schemaAttrs = DeviceSchemaConnector.inst
          .getDeviceSchema(deviceId)
          ?.propertyDescriptors.get(propInfo.key);

        //always update DeviceProxy with full PropertyInfo
        // This is what ensures model.type is never undefined
        deviceManager.applyPropertyUpdate(deviceId, propInfo);

        const propMonitors = this._propertyMonitors.get(deviceId);

        // If nobody is watching this specific property,
        // we still already updated the proxy above.
        if (!propMonitors || !propMonitors.has(propInfo.key)) {
          continue;
        }

        const propUpdateHandlers = propMonitors.get(propInfo.key);
        if (!propUpdateHandlers || propUpdateHandlers.length === 0) continue;

        // Table property special handling for UI handlers
        if (propInfo.type === HashTypes.VectorHash) {
          const tableCells = this._extractCellValues(propInfo);

          // Handlers for table widgets still expect cells
          for (const propUpdateHandler of propUpdateHandlers) {
            propUpdateHandler(tableCells);
          }

          continue;
        }

        // Normal scalar/vector properties
        for (const propUpdateHandler of propUpdateHandlers) {
          this._dispatchPropUpdate(deviceId, propUpdateHandler, propInfo);
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
      for (const [, hashNode] of Object.entries(hashVector[row])) {
        rowCells.push(hashNode.value.value_ as VectorElementType);
      }
      tableCells.push(rowCells);
    }

    return tableCells;
  };

  /**
   * Public convenience API for widgets/hooks:
   *
   * Ensures that the device is being monitored on the GUI server
   * as long as at least one "logical subscription" exists for
   * (deviceId, propertyId).
   *
   * Returns a cleanup function that decrements the logical subscription count.
   */
  ensurePropertyMonitored(deviceId: string, propertyId: string): () => void {
    const noOpHandler: PropertyUpdateHandler = () => {
      // We don't use the handler in the new world; DeviceManager
      // is updated through reportPropertyValue instead.
    };

    this.registerPropertyMonitor(deviceId, propertyId, noOpHandler);

    return () => {
      this.unregisterPropertyMonitor(deviceId, propertyId, noOpHandler);
    };
  }
}
