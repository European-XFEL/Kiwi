export interface AppSettings {
  wsProxyURL: string;
}

export const initAppSettings = (): AppSettings => {
  const wsProxyUrlList = import.meta.env
    .VITE_REACT_APP_WEBSOCKET_PROXY_SERVER_BASE_URL as string;
  const wsProxyURLs = wsProxyUrlList.split(';');
  const urlIdx = Math.floor(Math.random() * wsProxyURLs.length);

  return {
    wsProxyURL: wsProxyURLs[urlIdx],
  };
};
