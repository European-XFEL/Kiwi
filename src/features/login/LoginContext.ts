import { createContext, useContext } from 'react';
import { ActivityStatus, GuiServerType, ServerProbeResult } from './auth.types';

export interface LoginContextValue {
  host: string;
  port: string;
  userName: string;
  password: string;
  userAccessLevel: number;
  guiServerType: GuiServerType | null;
  probeResult: ServerProbeResult;
  activityStatus: ActivityStatus;
  setHost: (host: string) => void;
  setPort: (port: string) => void;
  setUserName: (userName: string) => void;
  setPassword: (password: string) => void;
  setUserAccessLevel: (level: number) => void;
  setProbeResult: (result: ServerProbeResult) => void;
  setActivityStatus: (status: ActivityStatus) => void;
}

export const LoginContext = createContext<LoginContextValue | null>(null);

export function useLoginContext(): LoginContextValue {
  const context = useContext(LoginContext);
  if (!context) {
    throw new Error('Login forms must be rendered within LoginContext');
  }
  return context;
}
