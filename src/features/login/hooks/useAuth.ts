import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNetwork } from '@/singletons/api';
import { AccessLevel } from '@/karabo_data/SchemaEnums';
import { GuiServerInfo } from '@/karabo_data/GuiServerInfo';
import AuthServerClient from '@/http/AuthServerClient';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { ActivityStatus } from '../types/auth.types';

interface UseAuthProps {
  probedServerInfo: GuiServerInfo | null;
  setActivityStatus: (status: ActivityStatus) => void;
  setErrorMessage: (msg: string) => void;
}

interface UseAuthReturn {
  userName: string;
  passwd: string;
  accessLevel: number;
  setUserName: (name: string) => void;
  setPasswd: (pwd: string) => void;
  setAccessLevel: (level: number) => void;
  doLogin: (host: string, port: string) => Promise<void>;
}

/**
 * Hook to manage user authentication and login
 */
export function useAuth({
  probedServerInfo,
  setActivityStatus,
  setErrorMessage,
}: UseAuthProps): UseAuthReturn {
  const setLoggedIn = useGlobalStore((s) => s.setLoggedIn);
  const { authServerURL } = useAppSettingsStore();
  const navigate = useNavigate();

  const [userName, setUserName] = useState('');
  const [passwd, setPasswd] = useState('');
  const [accessLevel, setAccessLevel] = useState(0);

  const authServerURLRef = useRef('');

  // Auth session started callback
  const onAuthSessionStarted = useCallback(
    (
      lvl: AccessLevel,
      h: string,
      p: number,
      topic: string,
      serverVersion: string
    ) => {
      localStorage.setItem('lastHost', h);
      localStorage.setItem('lastPort', `${p}`);
      setActivityStatus(ActivityStatus.NO_ACTIVITY);

      setLoggedIn({
        accessLevel: lvl,
        loggedUser: userName,
        guiServerHost: h,
        guiServerPort: p,
        guiServerTopic: topic,
        guiServerVersion: serverVersion,
        sessionStartEpoc: Date.now(),
      });

      navigate('no_scene');
    },
    [userName, setLoggedIn, navigate, setActivityStatus]
  );

  // Session start failure callback
  const onSessionStartFailure = useCallback(
    (errMsg: string) => {
      setActivityStatus(ActivityStatus.NO_ACTIVITY);
      setErrorMessage(`Login error: ${errMsg}`);
    },
    [setActivityStatus, setErrorMessage]
  );

  // Update auth server URL ref
  if (!authServerURLRef.current) {
    authServerURLRef.current = authServerURL;
  }

  // Main login function
  const doLogin = useCallback(
    async (host: string, port: string) => {
      const portNum = parseInt(port, 10);
      if (!host || Number.isNaN(portNum)) return;

      // Case A: Authentication Required
      if (probedServerInfo?.authRequired) {
        setActivityStatus(ActivityStatus.AUTH_USER);

        try {
          const authCli = new AuthServerClient(authServerURLRef.current);
          const authResult = await authCli.authenticateUser({
            username: userName,
            password: passwd,
          });

          if (!authResult.success) {
            setActivityStatus(ActivityStatus.NO_ACTIVITY);
            setErrorMessage(`Auth error: ${authResult.error_msg!}`);
            return;
          }

          setActivityStatus(ActivityStatus.CONNECTING_SERVER);
          getNetwork().startAuthSession(
            host.trim(),
            portNum,
            userName,
            authResult.once_token!,
            authResult.refresh_token!,
            onAuthSessionStarted,
            onSessionStartFailure
          );
        } catch (error: any) {
          setActivityStatus(ActivityStatus.NO_ACTIVITY);
          setErrorMessage(`Auth error: ${error.message || 'Unknown error'}`);
        }
      }
      // Case B: No Authentication
      else {
        setActivityStatus(ActivityStatus.CONNECTING_SERVER);
        getNetwork().startNonAuthSession(
          host.trim(),
          portNum,
          userName,
          accessLevel,
          onAuthSessionStarted,
          onSessionStartFailure
        );
      }
    },
    [
      userName,
      passwd,
      accessLevel,
      probedServerInfo,
      onAuthSessionStarted,
      onSessionStartFailure,
      setActivityStatus,
      setErrorMessage,
    ]
  );

  return {
    userName,
    passwd,
    accessLevel,
    setUserName,
    setPasswd,
    setAccessLevel,
    doLogin,
  };
}
