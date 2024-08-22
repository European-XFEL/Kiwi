import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface GlobalAppState {
  // TODO: Refine ERROR: INIT_ERROR, SCENE_OPEN_ERROR, TRANSIENT_ERROR, DISCONNECTED_ERROR
  // INIT_ERROR -> Advice to reload the page (takes full page view port). Goes back to INIT
  // SCENE_OPEN_ERROR -> Modal that takes the central area of the logged-in view port,
  //                     back to the default "Welcome Screen" when dialog dismissed with
  //                     state LOGGED_IN
  // TRANSIENT_ERROR -> When a scene has been successfully loaded (e.g. unexpected value
  //                    for a property). Displays a temporary (and dismissable) pop up
  //                    at the bottom of the screen and follows up life
  // DISCONNECTED_ERROR -> Advice to reload the page (takes full page view port). Goes back to INIT
  globalState: "INIT" | "LOGGED_IN" | "LOGGED_OUT" | "ERROR";
  lastError: string;
  sessionInfo?: GuiServerSessionInfo;
  loadedScene?: string;
}

export interface GuiServerSessionInfo {
  loggedUser: string;
  accessLevel: number;
  guiServerHost: string;
  guiServerPort: number;
  guiServerTopic: string;
  guiServerVersion: string;
  sessionStartEpoc: number; // milliseconds since EPOC (UTC) for the session start
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
        sessionStartEpoc: action.payload.sessionStartEpoc,
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
