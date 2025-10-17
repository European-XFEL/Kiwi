import {
  DeviceInfo,
  TopologyEventType,
  DeviceServerInfo,
  SystemTopologyInfo,
  SystemTopologyUpdateInfo,
} from "@/karabo_data/TopologyInfo";

export type DeviceInfoUpdateHandler = (
  infoType: TopologyEventType,
  deviceInfo: DeviceInfo
) => void;

export class TopologyConnector {
  // #region Singleton
  private constructor() {}

  static #_inst?: TopologyConnector;
  static get inst(): TopologyConnector {
    if (!TopologyConnector.#_inst) {
      TopologyConnector.#_inst = new TopologyConnector();
    }
    return TopologyConnector.#_inst;
  }
  // #endregion

  // #region Full and partial topology updates

  private _systemTopology: SystemTopologyInfo = {
    devices: [],
    servers: [],
  };

  get systemTopology() {
    return this._systemTopology;
  }
  set systemTopology(topology: SystemTopologyInfo) {
    this._systemTopology = topology;

    for (const [deviceId, updateHandlers] of this._deviceInfoMonitors) {
      const deviceIdx = this._getDeviceIdx(deviceId);
      if (deviceIdx >= 0) {
        // Monitored device is online
        for (const updateHandler of updateHandlers) {
          updateHandler(
            TopologyEventType.NEW,
            this._systemTopology.devices[deviceIdx]
          );
        }
      } else {
        // Monitored device is offline
        for (const updateHandler of updateHandlers) {
          updateHandler(TopologyEventType.GONE, {
            deviceId: deviceId,
          });
        }
      }
    }
  }

  /**
   * Returns the index of the DeviceInfo record for a given deviceId in the topology
   * */
  _getDeviceIdx = (deviceId: string): number => {
    const deviceIdx = this._systemTopology.devices.findIndex(
      (value: DeviceInfo) => {
        return value.deviceId === deviceId;
      }
    );
    return deviceIdx;
  };

  isDeviceOnline = (deviceId: string): boolean => {
    const deviceIdx = this._getDeviceIdx(deviceId);
    return deviceIdx >= 0;
  };

  updateTopology = (updates: SystemTopologyUpdateInfo): void => {
    const {
      new: newInstances,
      update: updatedInstances,
      gone: goneInstances,
    } = updates;

    const { devices: newDevices, servers: newServers } = newInstances;
    const { devices: updatedDevices, servers: updatedServers } =
      updatedInstances;
    const { devices: goneDevices, servers: goneServers } = goneInstances;

    try {
      const currentDevices = this.systemTopology.devices;
      const currentServers = this.systemTopology.servers;

      // ===== HANDLE DEVICE ADDITIONS =====
      for (const newDevice of newDevices) {
        const existingDeviceIndex = currentDevices.findIndex(
          (currentDevice: DeviceInfo) =>
            currentDevice.deviceId === newDevice.deviceId
        );

        if (existingDeviceIndex === -1) {
          // Device doesn't exist, add it
          currentDevices.push(newDevice);
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
          if (this._deviceInfoMonitors.has(modifiedDevice.deviceId)) {
            // Sends updates to all known monitors for the device
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
          if (this._deviceInfoMonitors.has(removedDevice.deviceId)) {
            // Sends updates to all known monitors for the device
            for (const updateHandler of this._deviceInfoMonitors.get(
              removedDevice.deviceId
            )!) {
              // To signal that the device has been removed from the topology,
              // an undefined value is sent as the DeviceInfo
              updateHandler(TopologyEventType.GONE, {
                deviceId: removedDevice.deviceId,
              });
            }
          }
        } else {
          console.warn(
            `Inconsistent topology update: device to be removed, ${removedDevice.deviceId}, is not in the topology!`
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
      // This is the first property being monitored for the device.

      // Creates the map of device info update handlers for the device
      this._deviceInfoMonitors.set(
        deviceId,
        new Array<DeviceInfoUpdateHandler>()
      );
    }
    this._deviceInfoMonitors.get(deviceId)?.push(deviceInfoUpdateHandler);
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
