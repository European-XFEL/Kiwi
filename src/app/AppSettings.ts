export interface AppSettings {
  wsProxyURL: string;
}

export const initAppSettings = (): AppSettings => {
  const wsProxyURL = import.meta.env
    .VITE_REACT_APP_WEBSOCKET_PROXY_SERVER_BASE_URL as string;

  return {
    wsProxyURL: wsProxyURL,
  };
};
