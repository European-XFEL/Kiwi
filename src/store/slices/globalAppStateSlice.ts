import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { SceneModel } from "../../view_models/SceneModel";

export interface GlobalAppState {
  // UNRECOVERABLE_ERROR -> Advice to reload the page (takes full page view port). Goes back to INIT
  // SCENE_OPEN_ERROR -> Modal that takes the central area of the logged-in view port,
  //                     back to the default "Welcome Screen" when dialog dismissed with
  //                     state LOGGED_IN
  // SCENE_DISPLAY_ERROR -> When a scene has been successfully loaded (e.g. unexpected value
  //                        for a property). Displays a temporary (and dismissable) pop up
  //                        at the bottom of the screen and follows up life
  globalState:
    | "INIT"
    | "LOGGED_IN"
    | "LOGGED_OUT"
    | "UNRECOVERABLE_ERROR"
    | "SCENE_OPEN_ERROR";
  lastError: string;
  sessionInfo?: GuiServerSessionInfo;
  loadedScene?: SceneModel;
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
      state.globalState = "UNRECOVERABLE_ERROR";
      state.lastError = action.payload;
      state.sessionInfo = undefined;
    },
    setLoggedIn: (state, action: PayloadAction<GuiServerSessionInfo>) => {
      state.globalState = "LOGGED_IN";
      state.loadedScene = undefined;
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
    setLoggedOut: (state) => {
      state.globalState = "LOGGED_OUT";
      state.sessionInfo = undefined;
      state.loadedScene = undefined;
    },
  },
});
export const { setError, setLoggedIn, setLoggedOut } =
  globalAppStateSlice.actions;

export default globalAppStateSlice.reducer;
