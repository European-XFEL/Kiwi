import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { SceneModel } from "../../view_models/SceneModel";

export interface loadedSceneState {
  // Note: Doesn't use a Scene directly because Redux cannot serialize it
  scene?: SceneModel;
}

const initialState: loadedSceneState = {
  scene: undefined,
};

export const loadedSceneSlice = createSlice({
  name: "loadedScene",
  initialState,
  reducers: {
    setLoadedScene: (
      state: loadedSceneState,
      action: PayloadAction<SceneModel | undefined>
    ) => {
      state.scene = action.payload;
    },
  }, // reducers:
}); // createSlice

export const { setLoadedScene } = loadedSceneSlice.actions;

export default loadedSceneSlice.reducer;
