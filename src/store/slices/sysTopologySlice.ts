import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import {
  DeviceInfo,
  DeviceServerInfo,
  SystemTopologyInfo,
  SystemTopologyUpdateInfo,
} from "../../karabo_data/TopologyInfo";

export interface SystemTopologyState {
  // the current system topology
  topology: SystemTopologyInfo;
}

const initialState: SystemTopologyState = {
  topology: {
    devices: [],
    servers: [],
  },
};

export const sysTopologySlice = createSlice({
  name: "systemTopologyState",
  initialState,
  reducers: {
    // Sets the full topology in one go.
    setTopology: (
      state: SystemTopologyState,
      action: PayloadAction<SystemTopologyInfo>
    ) => {
      state.topology = {
        devices: action.payload.devices,
        servers: action.payload.servers,
      };
    },
    updateTopology: (
      state: SystemTopologyState,
      action: PayloadAction<SystemTopologyUpdateInfo>
    ) => {
      // Handle topology additions
      for (const deviceInfo of action.payload.new.devices) {
        const deviceInfoIdx = state.topology.devices.findIndex(
          (value: DeviceInfo) => value.deviceId === deviceInfo.deviceId
        );
        if (deviceInfoIdx === -1) {
          // As expected, the new device is not yet in the topology; add it.
          state.topology.devices.push(deviceInfo);
        } else {
          console.warn(
            `Inconsistent topology update: new device, ${deviceInfo.deviceId}, is already in the topology!`
          );
        }
      }
      for (const serverInfo of action.payload.new.servers) {
        const serverInfoIdx = state.topology.servers.findIndex(
          (value: DeviceServerInfo) => value.serverId === serverInfo.serverId
        );
        if (serverInfoIdx === -1) {
          // As expected, the new device server is not yet in the topology; add it.
          state.topology.servers.push(serverInfo);
        } else {
          console.warn(
            `Inconsistent topology update: new device server, ${serverInfo.serverId}, is already in the topology!`
          );
        }
      }
      // Handle topology updates
      for (const deviceInfo of action.payload.update.devices) {
        const deviceInfoIdx = state.topology.devices.findIndex(
          (value: DeviceInfo) => value.deviceId === deviceInfo.deviceId
        );
        if (deviceInfoIdx >= 0) {
          // As expected, the updated device is in the topology; update it.
          state.topology.devices[deviceInfoIdx] = deviceInfo;
        } else {
          console.warn(
            `Inconsistent topology update: updated device, ${deviceInfo.deviceId}, is not in the topology!`
          );
        }
      }
      for (const serverInfo of action.payload.update.servers) {
        const serverInfoIdx = state.topology.servers.findIndex(
          (value: DeviceServerInfo) => value.serverId === serverInfo.serverId
        );
        if (serverInfoIdx === -1) {
          // As expected, the updated device server is in the topology; update it.
          state.topology.servers[serverInfoIdx] = serverInfo;
        } else {
          console.warn(
            `Inconsistent topology update: updated device server, ${serverInfo.serverId}, is not in the topology!`
          );
        }
      }
      // Handle topology removals
      for (const deviceInfo of action.payload.gone.devices) {
        const deviceInfoIdx = state.topology.devices.findIndex(
          (value: DeviceInfo) => value.deviceId === deviceInfo.deviceId
        );
        if (deviceInfoIdx >= 0) {
          // As expected, the removed device is currently in the topology; remove it.
          state.topology.devices.splice(deviceInfoIdx, 1);
        } else {
          console.warn(
            `Inconsistent topology update: device to be removed, ${deviceInfo.deviceId}, is not in the topology!`
          );
        }
      }
      for (const serverInfo of action.payload.gone.servers) {
        const serverInfoIdx = state.topology.servers.findIndex(
          (value: DeviceServerInfo) => value.serverId === serverInfo.serverId
        );
        if (serverInfoIdx >= 0) {
          // As expected, the removed device server is currently in the topology; remove it.
          state.topology.servers.splice(serverInfoIdx, 1);
        } else {
          console.warn(
            `Inconsistent topology update: device server to be removed, ${serverInfo.serverId}, is not in the topology!`
          );
        }
      }
    },
  },
});

export const { setTopology, updateTopology } = sysTopologySlice.actions;

export default sysTopologySlice.reducer;
