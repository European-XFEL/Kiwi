import { create } from 'zustand';
import { SceneSize } from './store.types';
import { type FitMode } from '@/features/scene-view';

export interface LoadedSceneStateStoreProp {
  scene?: SceneSize;
  setScene: (scene?: SceneSize) => void;
  fitMode: FitMode;
  setFitMode: (mode: FitMode) => void;
}

export const useLoadedSceneStore = create<LoadedSceneStateStoreProp>((set) => ({
  scene: undefined,
  setScene: (scene) => set({ scene, fitMode: 'fit-page' }),
  fitMode: 'fit-page',
  setFitMode: (fitMode) => set({ fitMode }),
}));
