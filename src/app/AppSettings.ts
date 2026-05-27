export interface AppSettings {
  wsProxyURL: string;
}

export const initAppSettings = (): AppSettings => {
  const wsProxyUrlList = import.meta.env
    .VITE_REACT_APP_WEBSOCKET_PROXY_SERVER_BASE_URL as string;
  if (wsProxyUrlList === undefined) {
    // No wsProxyURL defined in the environment - will use non-proxied
    // connetion mode
    return { wsProxyURL: '' };
  } else {
    const wsProxyURLs = wsProxyUrlList.split(';');
    const urlIdx = Math.floor(Math.random() * wsProxyURLs.length);

    return {
      wsProxyURL: wsProxyURLs[urlIdx],
    };
  }
};
