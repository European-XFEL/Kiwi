import { create } from 'zustand';
import { SceneModel } from '@/view_models/SceneModel';

export interface LoadedSceneStateStoreProp {
  scene?: SceneModel;
  setScene: (scene?: SceneModel) => void;
}

export const useLoadedSceneStore = create<LoadedSceneStateStoreProp>((set) => ({
  scene: undefined,
  setScene: (scene) => set({ scene: scene }),
}));
