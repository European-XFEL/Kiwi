import { create } from 'zustand';
import { type LoadedSceneRef } from './store.types';

// Active scene identity/metadata. Fit mode is per-tab state owned by
// PanelWrangler's SceneTabContent, not global store state, so it does not live
// here (mirrors useActiveSceneStore).
export interface LoadedSceneStateStoreProp {
  loadedSceneRef?: LoadedSceneRef;
  setLoadedSceneRef: (loadedSceneRef?: LoadedSceneRef) => void;
}

export const useLoadedSceneStore = create<LoadedSceneStateStoreProp>((set) => ({
  loadedSceneRef: undefined,
  setLoadedSceneRef: (loadedSceneRef) => set({ loadedSceneRef }),
}));
