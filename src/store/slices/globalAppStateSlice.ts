import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface GlobalAppState {
  globalState: "INIT" | "LOGGED_IN" | "LOGGED_OUT" | "ERROR";
  lastError: string;
  sessionInfo?: GuiServerSessionInfo;
}

export interface GuiServerSessionInfo {
  loggedUser: string;
  accessLevel: number;
  guiServerHost: string;
  guiServerPort: number;
  guiServerTopic: string;
  guiServerVersion: string;
}

const initialState: GlobalAppState = {
  globalState: "INIT",
  lastError: "",
  sessionInfo: undefined,
};

export const globalAppStateSlice = createSlice({
  name: "globalAppState",
  initialState,
  reducers: {
    setError: (state: GlobalAppState, action: PayloadAction<string>) => {
      state.globalState = "ERROR";
      state.lastError = action.payload;
    },
    setLoggedIn: (
      state: GlobalAppState,
      action: PayloadAction<GuiServerSessionInfo>
    ) => {
      state.globalState = "LOGGED_IN";
      state.sessionInfo = {
        loggedUser: action.payload.loggedUser,
        accessLevel: action.payload.accessLevel,
        guiServerHost: action.payload.guiServerHost,
        guiServerPort: action.payload.guiServerPort,
        guiServerTopic: action.payload.guiServerTopic,
        guiServerVersion: action.payload.guiServerVersion,
      };
    },
    setLoggedOut: (state: GlobalAppState) => {
      state.globalState = "LOGGED_OUT";
      state.sessionInfo = undefined;
    },
  },
});

export const { setError, setLoggedIn, setLoggedOut } =
  globalAppStateSlice.actions;

export default globalAppStateSlice.reducer;
