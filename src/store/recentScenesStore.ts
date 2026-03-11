import {
  RecentScenesByUser,
  UserRecentSceneInfo,
  RecentSceneInfo,
} from './store.types';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

const MRU_SCENES_SIZE = 6;
const MRU_SCENES_KEY = 'MRU_SCENES_';

function moveFront<T>(arr: readonly T[], index: number): T[] {
  const len = arr.length;
  if (index < 0 || index >= len) {
    throw new Error('index out of bounds');
  }
  if (index === 0) {
    return arr.slice();
  }
  return [arr[index], ...arr.slice(0, index), ...arr.slice(index + 1)];
}

// Confirm from local storage if there are recent scenes
const loadRecentScenes = (): RecentScenesByUser[] | null => {
  try {
    const recentScenesKeys = Object.keys(localStorage).filter((key: string) =>
      key.startsWith(MRU_SCENES_KEY)
    );
    if (recentScenesKeys.length === 0) return null;

    const recentScenes: any[] = [];
    for (const key of recentScenesKeys) {
      // The keys of the localStorage are of the form: ${MRU_SCENES_KEY}${userId}
      const userId = key.substring(MRU_SCENES_KEY.length);
      const storedData = localStorage.getItem(key);
      if (storedData) {
        recentScenes.push({
          userId: userId,
          scenes: JSON.parse(storedData),
        });
      }
    }
    return recentScenes.length > 0 ? recentScenes : null;
  } catch (error) {
    console.warn('Failed to load recent scenes from localStorage:', error);
    return null;
  }
};

// State types
export interface RecentSceneStoreState {
  recentScenes: Map<string, RecentSceneInfo[]>;
}

// Action types
export interface RecentSceneStoreActions {
  setRecentScene: (scene: UserRecentSceneInfo) => void;
  removeRecentScene: (
    userId: string,
    sceneId: { domain: string; uuid: string }
  ) => void;
  getRecentScenesForUser: (userId: string) => RecentSceneInfo[];
}

// Store type
type TRecentStore = RecentSceneStoreState & RecentSceneStoreActions;

// Helper function to return a map
const createInitialState = (): RecentSceneStoreState => {
  const loadedScenes = loadRecentScenes();
  const recentScenesMap = new Map<string, RecentSceneInfo[]>();

  if (loadedScenes) {
    // Load all users' scenes, not just the first one
    loadedScenes.forEach((userScenes) => {
      recentScenesMap.set(userScenes.userId, userScenes.scenes);
    });
  }

  return {
    recentScenes: recentScenesMap,
  };
};

// Initial state of the recent scene
const initialState: RecentSceneStoreState = createInitialState();

export const useRecentStore = create<TRecentStore>()(
  subscribeWithSelector((set, get) => ({
    // Spread the initial state
    ...initialState,

    setRecentScene: (userScene: UserRecentSceneInfo) =>
      set((state) => {
        // Create a new Map to ensure immutability
        const newRecentScenes = new Map(state.recentScenes);

        // Destructure the payload
        const { userId, uuid, domain, name, projectName } = userScene;

        // Load the scenes in the state if any
        let scenes = newRecentScenes.get(userId) ?? [];
        // Create a copy of the scenes array to avoid mutation
        scenes = [...scenes];

        // Check if the scene already exists
        const index = scenes.findIndex(
          (scene) => scene.domain === domain && scene.uuid === uuid
        );

        if (index >= 0) {
          // Move existing scene to the top
          const rearrangedArray = moveFront<RecentSceneInfo>(scenes, index);
          scenes = rearrangedArray;
        } else {
          // Add new scene to the beginning
          const newScene: RecentSceneInfo = {
            domain,
            uuid,
            name,
            projectName,
          };
          scenes.unshift(newScene);

          // Remove excess scenes if we exceed the limit
          if (scenes.length > MRU_SCENES_SIZE) {
            scenes = scenes.slice(0, MRU_SCENES_SIZE);
          }
        }

        // Update the map with the new scenes
        newRecentScenes.set(userId, scenes);

        // Save to localStorage
        localStorage.setItem(
          `${MRU_SCENES_KEY}${userId}`,
          JSON.stringify(scenes)
        );

        // Return the new state
        return {
          recentScenes: newRecentScenes,
        };
      }),

    removeRecentScene: (
      userId: string,
      sceneId: { domain: string; uuid: string }
    ) =>
      set((state) => {
        const newRecentScenes = new Map(state.recentScenes);
        let scenes = newRecentScenes.get(userId) ?? [];

        // Filter out the scene to remove
        scenes = scenes.filter(
          (scene) =>
            !(scene.domain === sceneId.domain && scene.uuid === sceneId.uuid)
        );

        newRecentScenes.set(userId, scenes);
        localStorage.setItem(
          `${MRU_SCENES_KEY}${userId}`,
          JSON.stringify(scenes)
        );

        return {
          recentScenes: newRecentScenes,
        };
      }),

    getRecentScenesForUser: (userId: string) => {
      const state = get();
      return state.recentScenes.get(userId) ?? [];
    },
  }))
);
