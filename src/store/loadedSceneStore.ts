import { create } from 'zustand';
import { type LoadedSceneRef } from './store.types';
import { type FitMode } from '@/features/scene-view/api';

export interface LoadedSceneStateStoreProp {
  loadedSceneRef?: LoadedSceneRef;
  setLoadedSceneRef: (loadedSceneRef?: LoadedSceneRef) => void;
  fitMode: FitMode;
  setFitMode: (mode: FitMode) => void;
}

export const useLoadedSceneStore = create<LoadedSceneStateStoreProp>((set) => ({
  loadedSceneRef: undefined,
  setLoadedSceneRef: (loadedSceneRef) =>
    set({ loadedSceneRef, fitMode: 'fit-page' }),
  fitMode: 'fit-page',
  setFitMode: (fitMode) => set({ fitMode }),
}));
