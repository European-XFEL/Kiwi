import { create } from 'zustand';
import { SceneModel } from '@/view_models/SceneModel';
import { type FitMode } from '@/features/scene_view/hooks/useSceneScale';

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
