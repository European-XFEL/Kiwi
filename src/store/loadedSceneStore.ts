import { create } from 'zustand';
import { SceneModel } from './store.types';
import { type FitMode } from '@/features/scene-view';

export interface LoadedSceneStateStoreProp {
  scene?: SceneModel;
  setScene: (scene?: SceneModel) => void;
  fitMode: FitMode;
  setFitMode: (mode: FitMode) => void;
}

export const useLoadedSceneStore = create<LoadedSceneStateStoreProp>((set) => ({
  scene: undefined,
  setScene: (scene) => set({ scene, fitMode: 'fit-page' }),
  fitMode: 'fit-page',
  setFitMode: (fitMode) => set({ fitMode }),
}));
