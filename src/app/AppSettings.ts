export interface AppSettings {
  wsProxyURL: string;
  topicGuiServerMapping: string;
}

export const initAppSettings = (): AppSettings => {
  const wsProxyUrlList = import.meta.env
    .VITE_REACT_APP_WEBSOCKET_PROXY_SERVER_BASE_URL as string;
  let wsProxyURL = '';
  if (wsProxyUrlList) {
    const wsProxyURLs = wsProxyUrlList.split(';');
    const urlIdx = Math.floor(Math.random() * wsProxyURLs.length);
    wsProxyURL = wsProxyURLs[urlIdx];
    if (!wsProxyURL.startsWith('ws') && !wsProxyURL.startsWith('http')) {
      // The URL doesn't specify a protocol and hence is not absolute; derive
      // an absolute URL from the current browser location
      const wsProtocol = window.location.protocol.startsWith('https')
        ? 'wss'
        : 'ws';
      wsProxyURL = `${wsProtocol}://${window.location.host}${wsProxyURL}`;
    }
  }

  const topicGuiServerMapping = import.meta.env
    .VITE_REACT_APP_TOPIC_SERVER_MAP as string;
  if (topicGuiServerMapping) {
    return {
      wsProxyURL: wsProxyURL,
      topicGuiServerMapping: topicGuiServerMapping,
    };
  } else {
    return { wsProxyURL: wsProxyURL, topicGuiServerMapping: '' };
  }
};
