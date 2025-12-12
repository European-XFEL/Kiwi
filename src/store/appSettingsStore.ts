import { create } from 'zustand';

export interface AppSettingsState {
  wsProxyURL: string;
  authServerURL: string;
}

export interface AppSettingsStateStoreProp extends AppSettingsState {
  setWsProxyUrl: (websocketProxyUrl: string) => void;
  setAuthServerUrl: (authServerUrl: string) => void;
}

export const useAppSettingsStore = create<AppSettingsStateStoreProp>((set) => ({
  //initial state
  wsProxyURL: '',
  authServerURL: '',

  //actions
  setWsProxyUrl: (websocketProxyUrl) => set({ wsProxyURL: websocketProxyUrl }),
  setAuthServerUrl: (authServerUrl) => set({ authServerURL: authServerUrl }),
}));
