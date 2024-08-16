import { configureStore } from "@reduxjs/toolkit";

import appSettingsReducer from "./slices/appSettingsSlice";
import globalAppStateReducer from "./slices/globalAppStateSlice";
import sysTopologyReducer from "./slices/sysTopologySlice";

export const store = configureStore({
  reducer: {
    appSettings: appSettingsReducer,
    globalAppState: globalAppStateReducer,
    sysTopology: sysTopologyReducer,
  },
});

// Infers the type of the Store state.
export type StoreState = ReturnType<typeof store.getState>;
// Infers the type of the store's dispatch.
export type StoreDispatch = typeof store.dispatch;
