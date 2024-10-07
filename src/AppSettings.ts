export interface AppSettings {
  wsProxyURL: string;
  authServerURL: string;
}

export const initAppSettings = (): AppSettings => {
  const authServerURL = import.meta.env
    .VITE_REACT_APP_AUTH_SERVER_BASE_URL as string;
  const wsProxyURL = import.meta.env
    .VITE_REACT_APP_WEBSOCKET_PROXY_SERVER_BASE_URL as string;

  return {
    wsProxyURL: wsProxyURL,
    authServerURL: authServerURL,
  };
};
