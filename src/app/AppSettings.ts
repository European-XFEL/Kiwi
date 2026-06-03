export interface AppSettings {
  wsProxyURL: string;
}

export const initAppSettings = (): AppSettings => {
  const wsProxyUrlList = import.meta.env
    .VITE_REACT_APP_WEBSOCKET_PROXY_SERVER_BASE_URL as string;
  if (wsProxyUrlList === undefined) {
    // No wsProxyURL defined in the environment - will use non-proxied
    // connection mode
    return { wsProxyURL: '' };
  } else {
    const wsProxyURLs = wsProxyUrlList.split(';');
    const urlIdx = Math.floor(Math.random() * wsProxyURLs.length);
    let url = wsProxyURLs[urlIdx];
    if (!url.startsWith('ws') && !url.startsWith('http')) {
      // The URL doesn't specify a protocol and hence is not absolute; derive
      // an absolute URL from the current browser location
      const wsProtocol = window.location.protocol.startsWith('https')
        ? 'wss'
        : 'ws';
      url = `${wsProtocol}://${window.location.host}${url}`;
    }
    return {
      wsProxyURL: url,
    };
  }
};
