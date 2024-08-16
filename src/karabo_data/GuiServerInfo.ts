export interface GuiServerInfo {
  deviceId: string;
  hostname: string;
  hostport: number;
  authRequired: boolean;
  authServer: string;
  readOnly: boolean;
  topic: string;
  version: string;
}
