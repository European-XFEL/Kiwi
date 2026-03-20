import { create } from 'zustand';

export interface AppSettingsState {
  wsProxyURL: string;
}

export interface AppSettingsStateStoreProp extends AppSettingsState {
  setWsProxyUrl: (websocketProxyUrl: string) => void;
}

export const useAppSettingsStore = create<AppSettingsStateStoreProp>((set) => ({
  //initial state
  wsProxyURL: '',

  //actions
  setWsProxyUrl: (websocketProxyUrl) => set({ wsProxyURL: websocketProxyUrl }),
}));
