import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface AppSettingsState {
  ws_proxy_url: string;
  auth_server_url: string;
}

const initialState: AppSettingsState = {
  ws_proxy_url: "",
  auth_server_url: "",
};

export const appSettingsSlice = createSlice({
  name: "appSettings",
  initialState,
  reducers: {
    setWsProxyUrl: (state: AppSettingsState, action: PayloadAction<string>) => {
      state.ws_proxy_url = action.payload;
    },
    setAuthServerUrl: (
      state: AppSettingsState,
      action: PayloadAction<string>
    ) => {
      state.auth_server_url = action.payload;
    },
  },
});

export const { setWsProxyUrl, setAuthServerUrl } = appSettingsSlice.actions;

export default appSettingsSlice.reducer;
