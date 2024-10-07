import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import {
  RecentSceneModel,
  RecentScenesByUser,
  UserRecentSceneModel,
} from "../../view_models/RecentScenesModel";

const MRU_SCENES_SIZE = 6;
const MRU_SCENES_KEY = "MRU_SCENES_";

export interface RecentScenesState {
  // Note: A Map<string, RecentScenesModel[]> is not used because the Map type
  // cannot be serialized by Redux
  recentScenes: RecentScenesByUser[];
}

const loadRecentScenes = (): RecentScenesByUser[] => {
  const recentScenesKeys = Object.keys(localStorage).filter((key: string) =>
    key.startsWith(MRU_SCENES_KEY)
  );
  const recentScenes = [];
  for (const key of recentScenesKeys) {
    // The keys of the localStorage are of the form: ${MRU_SCENES_KEY}${userId}
    const userId = key.substring(MRU_SCENES_KEY.length);
    recentScenes.push({
      userId: userId,
      scenes: JSON.parse(localStorage.getItem(key)!),
    });
  }
  return recentScenes;
};

const initialState: RecentScenesState = {
  recentScenes: loadRecentScenes(),
};

export const recentScenesSlice = createSlice({
  name: "recentScenes",
  initialState,
  reducers: {
    setRecentScene: (
      state: RecentScenesState,
      action: PayloadAction<UserRecentSceneModel>
    ) => {
      // Retrieves the user's recent scenes (if any)
      const userRecentScenes = state.recentScenes.filter(
        (userScenes: RecentScenesByUser) => {
          return userScenes.userId === action.payload.userId;
        }
      );
      let scenes: RecentSceneModel[] = [];
      if (userRecentScenes.length === 1) {
        scenes = userRecentScenes[0].scenes;
      }
      // If the scene was already among the recents, just move it to the top.
      if (scenes.length === 0) {
        // There was still no recent scene for the user
        scenes.push({
          domain: action.payload.domain,
          uuid: action.payload.uuid,
          name: action.payload.name,
          projectName: action.payload.projectName,
        });
        state.recentScenes.push({
          userId: action.payload.userId,
          scenes: scenes,
        });
      } else {
        // There was already at least one recent scene for the user.
        // If the scene was already among the recents, just move it to the top.
        const scenePos = scenes.findIndex(
          (recentScene) =>
            recentScene.domain === action.payload.domain &&
            recentScene.uuid === action.payload.uuid
        );
        if (scenePos >= 0) {
          const sceneInfo = JSON.parse(JSON.stringify(scenes[scenePos]));
          scenes.splice(scenePos, 1);
          scenes.unshift(sceneInfo);
        } else {
          if (scenes.length >= MRU_SCENES_SIZE) {
            // Must make room for the new recent scene
            scenes.splice(scenes.length - 1, 1);
          }
          scenes.unshift({
            domain: action.payload.domain,
            uuid: action.payload.uuid,
            name: action.payload.name,
            projectName: action.payload.projectName,
          });
        }
        // Update the user's recent scenes
        const userScenesIdx = state.recentScenes.findIndex(
          (userScenes: RecentScenesByUser) => {
            return userScenes.userId === action.payload.userId;
          }
        );
        state.recentScenes[userScenesIdx].scenes = scenes;
      }
      localStorage.setItem(
        `${MRU_SCENES_KEY}${action.payload.userId}`,
        JSON.stringify(scenes)
      );
    }, // setRecentScene
  }, // reducers:
}); // createSlice

export const { setRecentScene } = recentScenesSlice.actions;

export default recentScenesSlice.reducer;
