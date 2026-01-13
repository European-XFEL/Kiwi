import { AccessLevel } from '@/karabo_data/SchemaEnums';
import { GuiServerInfo } from '@/karabo_data/GuiServerInfo';

/**
 * Activity status during login process
 */
export enum ActivityStatus {
  NO_ACTIVITY = 'NO_ACTIVITY',
  PROBING_SERVER = 'PROBING_SERVER',
  CONNECTING_SERVER = 'CONNECTING_SERVER',
  AUTH_USER = 'AUTH_USER',
}

/**
 * Login credentials for authentication
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Authentication state
 */
export interface AuthState {
  isAuthenticated: boolean;
  username?: string;
  accessLevel?: AccessLevel;
}

/**
 * Server probe result
 */
export interface ServerProbeResult {
  serverInfo: GuiServerInfo | null;
  error?: string;
}

/**
 * Login form state
 */
export interface LoginFormState {
  host: string;
  port: string;
  username: string;
  password: string;
  accessLevel: number;
}
