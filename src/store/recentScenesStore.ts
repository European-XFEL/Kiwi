import {
  RecentScenesByUser,
  UserRecentSceneModel,
} from '../view_models/RecentScenesModel';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { RecentSceneModel } from '../view_models/RecentScenesModel';
import { moveItemToFirstPosition } from '../shared/helpers/arrayHelpers';

const MRU_SCENES_SIZE = 6;
const MRU_SCENES_KEY = 'MRU_SCENES_';

// Confirm from local storage if there are recent scenes
const loadRecentScenes = (): RecentScenesByUser[] | null => {
  try {
    const recentScenesKeys = Object.keys(localStorage).filter((key: string) =>
      key.startsWith(MRU_SCENES_KEY)
    );
    if (recentScenesKeys.length === 0) return null;

    const recentScenes = [];
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

// Save scenes to localStorage with error handling
const saveScenesToStorage = (
  userId: string,
  scenes: RecentSceneModel[]
): void => {
  try {
    localStorage.setItem(`${MRU_SCENES_KEY}${userId}`, JSON.stringify(scenes));
  } catch (error) {
    console.warn('Failed to save recent scenes to localStorage:', error);
  }
};

// State types
export interface RecentSceneStoreState {
  recentScenes: Map<string, RecentSceneModel[]>;
}

// Action types
export interface RecentSceneStoreActions {
  setRecentScene: (scene: UserRecentSceneModel) => void;
  removeRecentScene: (
    userId: string,
    sceneId: { domain: string; uuid: string }
  ) => void;
  clearRecentScenesForUser: (userId: string) => void;
  clearAllRecentScenes: () => void;
  getRecentScenesForUser: (userId: string) => RecentSceneModel[];
}

// Store type
type TRecentStore = RecentSceneStoreState & RecentSceneStoreActions;

// Helper function to return a map
const createInitialState = (): RecentSceneStoreState => {
  const loadedScenes = loadRecentScenes();
  const recentScenesMap = new Map<string, RecentSceneModel[]>();

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

const useRecentStore = create<TRecentStore>()(
  subscribeWithSelector((set, get) => ({
    // Spread the initial state
    ...initialState,

    setRecentScene: (userScene: UserRecentSceneModel) =>
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
        const existingSceneIndex = scenes.findIndex(
          (scene) => scene.domain === domain && scene.uuid === uuid
        );

        if (existingSceneIndex >= 0) {
          // Move existing scene to the top
          const rearrangedArray = moveItemToFirstPosition<RecentSceneModel>(
            scenes,
            existingSceneIndex
          );
          scenes = rearrangedArray;
        } else {
          // Add new scene to the beginning
          const newScene: RecentSceneModel = {
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
        saveScenesToStorage(userId, scenes);

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
        saveScenesToStorage(userId, scenes);

        return {
          recentScenes: newRecentScenes,
        };
      }),

    clearRecentScenesForUser: (userId: string) =>
      set((state) => {
        const newRecentScenes = new Map(state.recentScenes);
        newRecentScenes.set(userId, []);

        // Clear from localStorage
        try {
          localStorage.removeItem(`${MRU_SCENES_KEY}${userId}`);
        } catch (error) {
          console.warn(
            'Failed to clear recent scenes from localStorage:',
            error
          );
        }

        return {
          recentScenes: newRecentScenes,
        };
      }),

    clearAllRecentScenes: () =>
      set(() => {
        // Clear all localStorage entries
        try {
          const keysToRemove = Object.keys(localStorage).filter((key) =>
            key.startsWith(MRU_SCENES_KEY)
          );
          keysToRemove.forEach((key) => localStorage.removeItem(key));
        } catch (error) {
          console.warn(
            'Failed to clear all recent scenes from localStorage:',
            error
          );
        }

        return {
          recentScenes: new Map(),
        };
      }),

    getRecentScenesForUser: (userId: string) => {
      const state = get();
      return state.recentScenes.get(userId) ?? [];
    },
  }))
);

export default useRecentStore;
