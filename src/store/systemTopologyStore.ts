import { create } from "zustand";
import {
  DeviceInfo,
  DeviceServerInfo,
  SystemTopologyInfo,
  SystemTopologyUpdateInfo,
} from "../karabo_data/TopologyInfo";

export interface SystemTopologyState {
  topology: SystemTopologyInfo;
}

export interface SystemTopologyActions {
  setTopology: (payload: SystemTopologyInfo) => void;
  updateTopology: (payload: SystemTopologyUpdateInfo) => void;
}

export type SystemTopologyStore = SystemTopologyState & SystemTopologyActions;

const useSystemTopologyStore = create<SystemTopologyStore>((set) => ({
  // Initial state
  topology: {
    devices: [],
    servers: [],
  },

  // Actions
  setTopology: (payload: SystemTopologyInfo) =>
    set({
      topology: {
        devices: payload.devices,
        servers: payload.servers,
      },
    }),

  updateTopology: (payload: SystemTopologyUpdateInfo) =>
    set((state) => {
      // payload
      const {
        new: addedPayload,
        update: modifiedPayload,
        gone: removedPayload,
      } = payload;

      const { devices: addedDevices, servers: addedServers } = addedPayload;
      const { devices: modifiedDevices, servers: modifiedServers } =
        modifiedPayload;
      const { devices: removedDevices, servers: removedServers } =
        removedPayload;

      try {
        // Create mutable copies of current state for processing
        const updatedDevices = [...state.topology.devices];
        const updatedServers = [...state.topology.servers];

        // ===== HANDLE DEVICE ADDITIONS =====
        for (const newDevice of addedDevices) {
          const existingDeviceIndex = updatedDevices.findIndex(
            (currentDevice: DeviceInfo) =>
              currentDevice.deviceId === newDevice.deviceId
          );

          if (existingDeviceIndex === -1) {
            // Device doesn't exist, add it
            updatedDevices.push(newDevice);
          } else {
            console.warn(
              `Inconsistent topology update: new device, ${newDevice.deviceId}, is already in the topology!`
            );
          }
        }

        // ===== HANDLE SERVER ADDITIONS =====
        for (const newServer of addedServers) {
          const existingServerIndex = updatedServers.findIndex(
            (currentServer: DeviceServerInfo) =>
              currentServer.serverId === newServer.serverId
          );

          if (existingServerIndex === -1) {
            // Server doesn't exist, add it
            updatedServers.push(newServer);
          } else {
            console.warn(
              `Inconsistent topology update: new server, ${newServer.serverId}, is already in the topology!`
            );
          }
        }

        // ===== HANDLE DEVICE MODIFICATIONS =====
        for (const modifiedDevice of modifiedDevices) {
          const currentDeviceIndex = updatedDevices.findIndex(
            (currentDevice: DeviceInfo) =>
              currentDevice.deviceId === modifiedDevice.deviceId
          );

          if (currentDeviceIndex >= 0) {
            // Device exists, update it
            updatedDevices[currentDeviceIndex] = modifiedDevice;
          } else {
            console.warn(
              `Inconsistent topology update: updated device, ${modifiedDevice.deviceId}, is not in the topology!`
            );
          }
        }

        // ===== HANDLE SERVER MODIFICATIONS =====
        for (const modifiedServer of modifiedServers) {
          const currentServerIndex = updatedServers.findIndex(
            (currentServer: DeviceServerInfo) =>
              currentServer.serverId === modifiedServer.serverId
          );

          if (currentServerIndex >= 0) {
            // Server exists, update it
            updatedServers[currentServerIndex] = modifiedServer;
          } else {
            console.warn(
              `Inconsistent topology update: updated server, ${modifiedServer.serverId}, is not in the topology!`
            );
          }
        }

        // ===== HANDLE DEVICE REMOVALS =====
        for (const removedDevice of removedDevices) {
          const currentDeviceIndex = updatedDevices.findIndex(
            (currentDevice: DeviceInfo) =>
              currentDevice.deviceId === removedDevice.deviceId
          );

          if (currentDeviceIndex >= 0) {
            // Device exists, remove it
            updatedDevices.splice(currentDeviceIndex, 1);
          } else {
            console.warn(
              `Inconsistent topology update: device to be removed, ${removedDevice.deviceId}, is not in the topology!`
            );
          }
        }

        // ===== HANDLE SERVER REMOVALS =====
        for (const removedServer of removedServers) {
          const currentServerIndex = updatedServers.findIndex(
            (currentServer: DeviceServerInfo) =>
              currentServer.serverId === removedServer.serverId
          );

          if (currentServerIndex >= 0) {
            // Server exists, remove it
            updatedServers.splice(currentServerIndex, 1);
          } else {
            console.warn(
              `Inconsistent topology update: server to be removed, ${removedServer.serverId}, is not in the topology!`
            );
          }
        }

        // Return the new state with updated topology
        return {
          topology: {
            devices: updatedDevices,
            servers: updatedServers,
          },
        };
      } catch (error: any) {
        console.error(`Topology update failed: ${error.message}`);
        // Return current state unchanged on error
        return { topology: state.topology };
      }
    }),
}));

export default useSystemTopologyStore;
