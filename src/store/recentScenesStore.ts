import { getConfig } from '@/lib/singletons/api';
import { RecentSceneInfo, TopicRecentSceneInfo } from './store.types';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// State types
export interface RecentSceneStoreState {
  recentScenes: Map<string, RecentSceneInfo[]>;
}

// Action types
export interface RecentSceneStoreActions {
  setRecentScene: (scene: TopicRecentSceneInfo) => void;
  removeRecentScene: (
    topic: string,
    sceneId: { domain: string; uuid: string }
  ) => void;
  getRecentScenesForTopic: (topic: string) => RecentSceneInfo[];
}

// Store type
type TRecentStore = RecentSceneStoreState & RecentSceneStoreActions;

// Helper function to return a map
const createInitialState = (): RecentSceneStoreState => {
  return {
    recentScenes: new Map<string, RecentSceneInfo[]>(),
  };
};

// Initial state of the recent scene
const initialState: RecentSceneStoreState = createInitialState();

export const useRecentStore = create<TRecentStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    setRecentScene: (scene: TopicRecentSceneInfo) =>
      set((state) => {
        const newRecentScenes = new Map(state.recentScenes);

        const config = getConfig();

        config.setRecentScene(scene.topic, {
          domain: scene.domain,
          uuid: scene.uuid,
          name: scene.name,
          projectName: scene.projectName,
        });

        newRecentScenes.set(scene.topic, config.getRecentScenes(scene.topic));

        return {
          recentScenes: newRecentScenes,
        };
      }),

    removeRecentScene: (
      topic: string,
      sceneId: { domain: string; uuid: string }
    ) =>
      set((state) => {
        const newRecentScenes = new Map(state.recentScenes);

        const config = getConfig();

        config.removeRecentScene(topic, sceneId);

        const updatedScenes = config.getRecentScenes(topic);
        if (updatedScenes.length === 0) {
          newRecentScenes.delete(topic);
        } else {
          newRecentScenes.set(topic, updatedScenes);
        }

        return {
          recentScenes: newRecentScenes,
        };
      }),

    getRecentScenesForTopic: (topic: string) => {
      const state = get();
      const inMemoryScenes = state.recentScenes.get(topic);
      if (inMemoryScenes) {
        return inMemoryScenes;
      }

      return getConfig().getRecentScenes(topic);
    },
  }))
);
