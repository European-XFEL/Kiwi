/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REACT_APP_AUTH_SERVER_BASE_URL: string;
  readonly VITE_REACT_APP_WEBSOCKET_PROXY_SERVER_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
