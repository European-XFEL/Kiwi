import { create } from 'zustand';
import { type SceneModel } from './store.types';
import { AccessLevel } from '@/karabo/data/enums';

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
  | 'INIT'
  | 'LOGGED_IN'
  | 'LOGGED_OUT'
  | 'UNRECOVERABLE_ERROR'
  | 'SCENE_OPEN_ERROR'
  | 'SCENE_DISPLAY_ERROR';

/** Base state shape (no actions) */
export interface GlobalAppState {
  globalState: GlobalState;
  lastGlobalError: string;
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
  updateAccessLevel: (level: AccessLevel) => void;
}

/** Store = state + actions */
export type GlobalStore = GlobalAppState & GlobalActions;

//App initial state
export const initialState: GlobalAppState = {
  globalState: 'INIT',
  lastGlobalError: '',
  sessionInfo: undefined,
  loadedScene: undefined,
};

//store
export const useGlobalStore = create<GlobalStore>((set) => ({
  ...initialState,

  setError: (msg) =>
    set({
      globalState: 'UNRECOVERABLE_ERROR',
      lastGlobalError: msg,
      sessionInfo: undefined,
    }),

  setSceneOpenError: (sceneOPenErrorMessage: string) =>
    set({
      globalState: 'SCENE_OPEN_ERROR',
      lastGlobalError: sceneOPenErrorMessage,
    }),

  setSceneDisplayError: (sceneDisplayErrorMessage: string) =>
    set({
      globalState: 'SCENE_DISPLAY_ERROR',
      lastGlobalError: sceneDisplayErrorMessage,
    }),

  setLoggedIn: (session) =>
    set({
      globalState: 'LOGGED_IN',
      sessionInfo: session,
      loadedScene: undefined,
      lastGlobalError: '',
    }),

  setLoggedOut: () =>
    set({
      globalState: 'LOGGED_OUT',
      sessionInfo: undefined,
      loadedScene: undefined,
      lastGlobalError: '',
    }),

  setLoadedScene: (scene) =>
    set({
      loadedScene: scene,
    }),

  reset: () => set(() => ({ ...initialState })),

  updateAccessLevel: (level) =>
    set((state) => {
      if (!state.sessionInfo) return state; // nothing to update
      return {
        ...state,
        sessionInfo: {
          ...state.sessionInfo,
          accessLevel: level,
        },
      };
    }),
}));
