import { create } from 'zustand';

export interface AppSettingsState {
  wsProxyURL: string;
  topicServerMapping: string;
}

export interface AppSettingsStateStoreProp extends AppSettingsState {
  setWsProxyUrl: (websocketProxyUrl: string) => void;
  setTopicGuiServerMapping: (topicServerMapping) => void;
}

export const useAppSettingsStore = create<AppSettingsStateStoreProp>((set) => ({
  //initial state
  wsProxyURL: '',
  topicServerMapping: '',

  //actions
  setWsProxyUrl: (websocketProxyUrl) => set({ wsProxyURL: websocketProxyUrl }),
  setTopicGuiServerMapping: (topicServerMapping) =>
    set({ topicServerMapping: topicServerMapping }),
}));
