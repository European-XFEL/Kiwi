import {
  DeviceInfo,
  TopologyEventType,
  DeviceServerInfo,
  SystemTopologyInfo,
  SystemTopologyUpdateInfo,
  MacroInfo,
} from '@/karabo_data/TopologyInfo';
import { deviceManager } from '@/device/DeviceManager';

export type DeviceInfoUpdateHandler = (
  infoType: TopologyEventType,
  deviceInfo: DeviceInfo
) => void;

export class TopologyConnector {
  public constructor() {}

  // #region Full and partial topology updates

  private _systemTopology: SystemTopologyInfo = {
    devices: [],
    servers: [],
    macros: [],
  };

  get systemTopology() {
    return this._systemTopology;
  }

  set systemTopology(topology: SystemTopologyInfo) {
    this._systemTopology = topology;

    // Whenever we receive the full topology snapshot, update:
    //  - all registered deviceInfo monitors
    //  - the DeviceProxy (online/offline per device)
    for (const [deviceId, updateHandlers] of this._deviceInfoMonitors) {
      const deviceIdx = this._getDeviceIdx(deviceId);

      if (deviceIdx >= 0) {
        // Monitored device is online
        this._applyTopologyEvent(deviceId, TopologyEventType.NEW);

        for (const updateHandler of updateHandlers) {
          updateHandler(
            TopologyEventType.NEW,
            this._systemTopology.devices[deviceIdx]
          );
        }
      } else {
        // Macros are considered "devices" for topology matters
        const macroIdx = this._getMacroIdx(deviceId);
        if (macroIdx >= 0) {
          // Monitored "macro device" is online
          this._applyTopologyEvent(deviceId, TopologyEventType.NEW);

          for (const updateHandler of updateHandlers) {
            updateHandler(
              TopologyEventType.NEW,
              this._systemTopology.macros[macroIdx]
            );
          }
        } else {
          // Monitored device (or macro) is offline
          this._applyTopologyEvent(deviceId, TopologyEventType.GONE);

          for (const updateHandler of updateHandlers) {
            updateHandler(TopologyEventType.GONE, {
              deviceId,
            } as DeviceInfo);
          }
        }
      }
    }
  }

  /**
   * Apply topology event to DeviceProxy (update online/offline status)
   */
  private _applyTopologyEvent(
    deviceId: string,
    eventType: TopologyEventType
  ): void {
    const isOnline =
      eventType === TopologyEventType.NEW ||
      eventType === TopologyEventType.UPDATE;
    deviceManager.setOnlineFlag(deviceId, isOnline);
  }

  /**
   * Returns the index of the DeviceInfo record for a given deviceId in the topology
   */
  private _getDeviceIdx = (deviceId: string): number => {
    const deviceIdx = this._systemTopology.devices.findIndex(
      (value: DeviceInfo) => value.deviceId === deviceId
    );
    return deviceIdx;
  };

  /**
   * Returns the index of the MacroInfo record for a given macroId in the topology
   */
  private _getMacroIdx = (macroId: string): number => {
    const macroIdx = this._systemTopology.macros.findIndex(
      (value: MacroInfo) => value.deviceId === macroId
    );
    return macroIdx;
  };

  isDeviceOnline = (deviceId: string): boolean => {
    let deviceIdx = this._getDeviceIdx(deviceId);
    if (deviceIdx < 0) {
      // Maybe the deviceId refers to a macro
      deviceIdx = this._getMacroIdx(deviceId);
    }
    return deviceIdx >= 0;
  };

  updateTopology = (updates: SystemTopologyUpdateInfo): void => {
    const {
      new: newInstances,
      update: updatedInstances,
      gone: goneInstances,
    } = updates;

    const {
      devices: newDevices,
      servers: newServers,
      macros: newMacros,
    } = newInstances;
    const {
      devices: updatedDevices,
      servers: updatedServers,
      macros: updatedMacros,
    } = updatedInstances;
    const {
      devices: goneDevices,
      servers: goneServers,
      macros: goneMacros,
    } = goneInstances;

    try {
      const currentDevices = this.systemTopology.devices;
      const currentServers = this.systemTopology.servers;
      const currentMacros = this.systemTopology.macros;

      // ===== HANDLE DEVICE ADDITIONS =====
      for (const newDevice of newDevices) {
        const existingDeviceIndex = currentDevices.findIndex(
          (currentDevice: DeviceInfo) =>
            currentDevice.deviceId === newDevice.deviceId
        );

        if (existingDeviceIndex === -1) {
          // Device doesn't exist, add it
          currentDevices.push(newDevice);

          // Update proxy (device became visible in topology)
          this._applyTopologyEvent(newDevice.deviceId, TopologyEventType.NEW);

          if (this._deviceInfoMonitors.has(newDevice.deviceId)) {
            // Sends updates to all known monitors for the device
            for (const updateHandler of this._deviceInfoMonitors.get(
              newDevice.deviceId
            )!) {
              updateHandler(TopologyEventType.NEW, newDevice);
            }
          }
        } else {
          console.warn(
            `Inconsistent topology update: new device, ${newDevice.deviceId}, is already in the topology!`
          );
        }
      }

      // ===== HANDLE MACRO ADDITIONS =====
      for (const newMacro of newMacros) {
        const existingMacroIndex = currentMacros.findIndex(
          (currentMacro: MacroInfo) =>
            currentMacro.deviceId === newMacro.deviceId
        );

        if (existingMacroIndex === -1) {
          // Macro doesn't exist, add it
          currentMacros.push(newMacro);

          this._applyTopologyEvent(newMacro.deviceId, TopologyEventType.NEW);

          if (this._deviceInfoMonitors.has(newMacro.deviceId)) {
            // Sends updates to all known monitors for the macro
            for (const updateHandler of this._deviceInfoMonitors.get(
              newMacro.deviceId
            )!) {
              updateHandler(TopologyEventType.NEW, newMacro);
            }
          }
        } else {
          console.warn(
            `Inconsistent topology update: new macro, ${newMacro.deviceId}, is already in the topology!`
          );
        }
      }

      // ===== HANDLE SERVER ADDITIONS =====
      for (const newServer of newServers) {
        const existingServerIndex = currentServers.findIndex(
          (currentServer: DeviceServerInfo) =>
            currentServer.serverId === newServer.serverId
        );

        if (existingServerIndex === -1) {
          // Server doesn't exist, add it
          currentServers.push(newServer);
        } else {
          console.warn(
            `Inconsistent topology update: new server, ${newServer.serverId}, is already in the topology!`
          );
        }
      }

      // ===== HANDLE DEVICE MODIFICATIONS =====
      for (const modifiedDevice of updatedDevices) {
        const currentDeviceIndex = currentDevices.findIndex(
          (currentDevice: DeviceInfo) =>
            currentDevice.deviceId === modifiedDevice.deviceId
        );

        if (currentDeviceIndex >= 0) {
          // Device exists, update it
          currentDevices[currentDeviceIndex] = modifiedDevice;

          this._applyTopologyEvent(
            modifiedDevice.deviceId,
            TopologyEventType.UPDATE
          );

          if (this._deviceInfoMonitors.has(modifiedDevice.deviceId)) {
            for (const updateHandler of this._deviceInfoMonitors.get(
              modifiedDevice.deviceId
            )!) {
              updateHandler(TopologyEventType.UPDATE, modifiedDevice);
            }
          }
        } else {
          console.warn(
            `Inconsistent topology update: updated device, ${modifiedDevice.deviceId}, is not in the topology!`
          );
        }
      }

      // ===== HANDLE MACRO MODIFICATIONS =====
      for (const modifiedMacro of updatedMacros) {
        const currentMacroIndex = currentMacros.findIndex(
          (currentMacro: MacroInfo) =>
            currentMacro.deviceId === modifiedMacro.deviceId
        );

        if (currentMacroIndex >= 0) {
          // Macro exists, update it
          currentMacros[currentMacroIndex] = modifiedMacro;

          this._applyTopologyEvent(
            modifiedMacro.deviceId,
            TopologyEventType.UPDATE
          );

          if (this._deviceInfoMonitors.has(modifiedMacro.deviceId)) {
            for (const updateHandler of this._deviceInfoMonitors.get(
              modifiedMacro.deviceId
            )!) {
              updateHandler(TopologyEventType.UPDATE, modifiedMacro);
            }
          }
        } else {
          console.warn(
            `Inconsistent topology update: updated macro, ${modifiedMacro.deviceId}, is not in the topology!`
          );
        }
      }

      // ===== HANDLE SERVER MODIFICATIONS =====
      for (const modifiedServer of updatedServers) {
        const currentServerIndex = currentServers.findIndex(
          (currentServer: DeviceServerInfo) =>
            currentServer.serverId === modifiedServer.serverId
        );

        if (currentServerIndex >= 0) {
          // Server exists, update it
          currentServers[currentServerIndex] = modifiedServer;
        } else {
          console.warn(
            `Inconsistent topology update: updated server, ${modifiedServer.serverId}, is not in the topology!`
          );
        }
      }

      // ===== HANDLE DEVICE REMOVALS =====
      for (const removedDevice of goneDevices) {
        const currentDeviceIndex = currentDevices.findIndex(
          (currentDevice: DeviceInfo) =>
            currentDevice.deviceId === removedDevice.deviceId
        );

        if (currentDeviceIndex >= 0) {
          // Device exists, remove it
          currentDevices.splice(currentDeviceIndex, 1);

          this._applyTopologyEvent(
            removedDevice.deviceId,
            TopologyEventType.GONE
          );

          if (this._deviceInfoMonitors.has(removedDevice.deviceId)) {
            for (const updateHandler of this._deviceInfoMonitors.get(
              removedDevice.deviceId
            )!) {
              updateHandler(TopologyEventType.GONE, {
                deviceId: removedDevice.deviceId,
              } as DeviceInfo);
            }
          }
        } else {
          console.warn(
            `Inconsistent topology update: device to be removed, ${removedDevice.deviceId}, is not in the topology!`
          );
        }
      }

      // ===== HANDLE MACRO REMOVALS =====
      for (const removedMacro of goneMacros) {
        const currentMacroIndex = currentMacros.findIndex(
          (currentMacro: MacroInfo) =>
            currentMacro.deviceId === removedMacro.deviceId
        );

        if (currentMacroIndex >= 0) {
          // Macro exists, remove it
          currentMacros.splice(currentMacroIndex, 1);

          this._applyTopologyEvent(
            removedMacro.deviceId,
            TopologyEventType.GONE
          );

          if (this._deviceInfoMonitors.has(removedMacro.deviceId)) {
            for (const updateHandler of this._deviceInfoMonitors.get(
              removedMacro.deviceId
            )!) {
              updateHandler(TopologyEventType.GONE, {
                deviceId: removedMacro.deviceId,
              } as DeviceInfo);
            }
          }
        } else {
          console.warn(
            `Inconsistent topology update: macro to be removed, ${removedMacro.deviceId}, is not in the topology!`
          );
        }
      }

      // ===== HANDLE SERVER REMOVALS =====
      for (const removedServer of goneServers) {
        const currentServerIndex = currentServers.findIndex(
          (currentServer: DeviceServerInfo) =>
            currentServer.serverId === removedServer.serverId
        );

        if (currentServerIndex >= 0) {
          // Server exists, remove it
          currentServers.splice(currentServerIndex, 1);
        } else {
          console.warn(
            `Inconsistent topology update: server to be removed, ${removedServer.serverId}, is not in the topology!`
          );
        }
      }
    } catch (error: unknown) {
      console.error(`Topology update failed: ${(error as Error).message}`);
    }
  };

  // #endregion

  // #region DeviceInfoMonitors Management

  private _deviceInfoMonitors = new Map<string, DeviceInfoUpdateHandler[]>();

  registerDeviceInfoMonitor = (
    deviceId: string,
    deviceInfoUpdateHandler: DeviceInfoUpdateHandler
  ): void => {
    if (!this._deviceInfoMonitors.has(deviceId)) {
      // first monitor for this device
      this._deviceInfoMonitors.set(
        deviceId,
        new Array<DeviceInfoUpdateHandler>()
      );
    }
    this._deviceInfoMonitors.get(deviceId)!.push(deviceInfoUpdateHandler);

    // ───────────────────────────────────────────────
    // Seed current state from systemTopology
    // so refresh doesn't start "offline"
    // ───────────────────────────────────────────────
    const deviceIdx = this._getDeviceIdx(deviceId);
    if (deviceIdx >= 0) {
      const info = this._systemTopology.devices[deviceIdx];

      // Mark online in proxy + notify handler
      this._applyTopologyEvent(deviceId, TopologyEventType.NEW);
      deviceInfoUpdateHandler(TopologyEventType.NEW, info);
      return;
    }

    const macroIdx = this._getMacroIdx(deviceId);
    if (macroIdx >= 0) {
      const info = this._systemTopology.macros[macroIdx];

      this._applyTopologyEvent(deviceId, TopologyEventType.NEW);
      deviceInfoUpdateHandler(TopologyEventType.NEW, info);
      return;
    }

    // Not in topology at all → treat as offline
    this._applyTopologyEvent(deviceId, TopologyEventType.GONE);
    deviceInfoUpdateHandler(TopologyEventType.GONE, {
      deviceId,
    } as DeviceInfo);
  };

  unregisterDeviceInfoMonitor = (
    deviceId: string,
    deviceInfoUpdateHandler: DeviceInfoUpdateHandler
  ): void => {
    const deviceInfoMonitors = this._deviceInfoMonitors.get(deviceId);
    const handlerIdx = deviceInfoMonitors?.findIndex(
      (handler) => handler === deviceInfoUpdateHandler
    );
    if (handlerIdx !== undefined && handlerIdx >= 0) {
      deviceInfoMonitors?.splice(handlerIdx, 1);
    }
    if (deviceInfoMonitors?.length === 0) {
      // The last device info update handler for the device has been removed. Remove the map entry.
      this._deviceInfoMonitors.delete(deviceId);
    }
  };

  // #endregion
}
