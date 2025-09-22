import { create } from "zustand";
import type { SceneModel } from "../view_models/SceneModel";

/** App status tag */
// UNRECOVERABLE_ERROR -> Advice to reload the page (takes full page view port). Goes back to INIT

// // SCENE_OPEN_ERROR -> Modal that takes the central area of the logged-in view port,
//                     back to the default "Welcome Screen" when dialog dismissed with
//                     state LOGGED_IN

// SCENE_DISPLAY_ERROR -> When a scene has been successfully loaded (e.g. unexpected value
//                        for a property). Displays a temporary (and dismissable) pop up
//                        at the bottom of the screen and follows up life

export interface GuiServerSessionInfo {
  loggedUser: string;
  accessLevel: number;
  guiServerHost: string;
  guiServerPort: number;
  guiServerTopic: string;
  guiServerVersion: string;
  sessionStartEpoc: number; // milliseconds since EPOC (UTC) for the session start
}

export type GlobalState =
  | "INIT"
  | "LOGGED_IN"
  | "LOGGED_OUT"
  | "UNRECOVERABLE_ERROR"
  | "SCENE_OPEN_ERROR"
  | "SCENE_DISPLAY_ERROR";

/** Base state shape (no actions) */
export interface GlobalAppState {
  globalState: GlobalState;
  lastError: string;
  sessionInfo?: GuiServerSessionInfo;
  loadedScene?: SceneModel;
}

/** Actions */
export interface GlobalActions {
  setError: (msg: string) => void;
  setSceneOpenError: (msg: string) => void;
  setSceneDisplayError: (msg: string) => void;
  setLoggedIn: (session: GuiServerSessionInfo) => void;
  setLoggedOut: () => void;
  setLoadedScene: (scene?: SceneModel) => void;
  reset: () => void;
}

/** Store = state + actions */
export type GlobalStore = GlobalAppState & GlobalActions;

//App initial state
export const initialState: GlobalAppState = {
  globalState: "INIT",
  lastError: "",
  sessionInfo: undefined,
  loadedScene: undefined,
};

//store
export const useGlobalStore = create<GlobalStore>((set) => ({
  ...initialState,

  setError: (msg) =>
    set({
      globalState: "UNRECOVERABLE_ERROR",
      lastError: msg,
      sessionInfo: undefined,
    }),

  setSceneOpenError: (sceneOPenErrorMessage: string) =>
    set({
      globalState: "SCENE_OPEN_ERROR",
      lastError: sceneOPenErrorMessage,
    }),

  setSceneDisplayError: (sceneDisplayErrorMessage: string) =>
    set({
      globalState: "SCENE_DISPLAY_ERROR",
      lastError: sceneDisplayErrorMessage,
    }),

  setLoggedIn: (session) =>
    set({
      globalState: "LOGGED_IN",
      sessionInfo: session,
      loadedScene: undefined,
      lastError: "",
    }),

  setLoggedOut: () =>
    set({
      globalState: "LOGGED_OUT",
      sessionInfo: undefined,
      loadedScene: undefined,
      lastError: "",
    }),

  setLoadedScene: (scene) =>
    set({
      loadedScene: scene,
    }),

  reset: () => set(() => ({ ...initialState })),
}));
