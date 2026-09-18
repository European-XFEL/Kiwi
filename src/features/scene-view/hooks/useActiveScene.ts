import type { LoadedSceneRef } from '@/store/api';
import { create } from 'zustand';

// Holds the active scene's identity/metadata. Fit mode is NOT stored here: it is
// per-tab state owned by PanelWrangler's SceneTabContent so each tab keeps its
// own zoom-to-fit choice.
export interface ActiveSceneStore {
  loadedSceneRef?: LoadedSceneRef;
  setLoadedSceneRef: (loadedSceneRef?: LoadedSceneRef) => void;
  sceneLoadPending: boolean;
  setSceneLoadPending: (sceneLoadPending: boolean) => void;
}

export const useActiveSceneStore = create<ActiveSceneStore>((set) => ({
  loadedSceneRef: undefined,
  setLoadedSceneRef: (loadedSceneRef) => set({ loadedSceneRef }),
  sceneLoadPending: false,
  setSceneLoadPending: (sceneLoadPending) => set({ sceneLoadPending }),
}));
