import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { SystemTopologyInfo } from "../../karabo_data/TopologyInfo";

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
    // TODO: add a reducer (updateTopology) that takes an action with a
    //       topology update payload and merges those with the current topology
    //       yielding a new topology.
  },
});

export const { setTopology } = sysTopologySlice.actions;

export default sysTopologySlice.reducer;
