import { AccessLevel } from '@/karabo-hash/enums';

export enum ActivityStatus {
  NO_ACTIVITY = 'NO_ACTIVITY',
  PROBING_SERVER = 'PROBING_SERVER',
  CONNECTING_SERVER = 'CONNECTING_SERVER',
  AUTH_USER = 'AUTH_USER',
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  username?: string;
  accessLevel?: AccessLevel;
}

export interface ServerProbeResult {
  serverInfo: GuiServerInfo | null;
  error?: string;
}

export interface LoginFormState {
  host: string;
  port: string;
  username: string;
  password: string;
  accessLevel: number;
}

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
