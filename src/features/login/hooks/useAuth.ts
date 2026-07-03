import { useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getConfig, getNetwork } from '@/lib/singletons/api';
import type { SessionStartData } from '@/lib/singletons/Network';
import AuthServerClient from '@/lib/http/AuthServerClient';
import { useGlobalStore } from '@/store/api';
import { ActivityStatus, GuiServerInfo } from '../auth.types';
import { sceneParamsFromURL } from '@/features/navigation/utils';

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
  const navigate = useNavigate();
  const location = useLocation();

  const [userName, setUserName] = useState('');
  const [passwd, setPasswd] = useState('');
  const [accessLevel, setAccessLevel] = useState(0);

  const authServerURLRef = useRef('');

  // Auth session started callback
  const onAuthSessionStarted = useCallback(
    ({
      accessLevel,
      host,
      port,
      userId,
      isReadOnly,
      topic,
      serverVersion,
    }: SessionStartData) => {
      getConfig().lastHost = host;
      getConfig().lastPort = port;
      setActivityStatus(ActivityStatus.NO_ACTIVITY);

      setLoggedIn({
        accessLevel: accessLevel,
        loggedUser: userId,
        isReadOnly,
        guiServerHost: host,
        guiServerPort: port,
        guiServerTopic: topic,
        guiServerVersion: serverVersion,
        sessionStartEpoc: Date.now(),
      });

      const sceneParams = sceneParamsFromURL(location.search);
      if (!sceneParams) {
        navigate('home');
      }
      // else (there's are scene params in the location bar):  it means
      // the user activated some previously saved scene bookmark. Just let
      // the router handle the route and the scene will be loaded.
    },
    [setLoggedIn, navigate, location.search, setActivityStatus]
  );

  // Update auth server URL ref
  if (!authServerURLRef.current) {
    authServerURLRef.current = probedServerInfo?.authServer ?? '';
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
          try {
            const session = await getNetwork().startAuthSession(
              host.trim(),
              portNum,
              userName,
              authResult.once_token!,
              authResult.refresh_token!,
              probedServerInfo.readOnly
            );
            onAuthSessionStarted(session);
          } catch (error: any) {
            setActivityStatus(ActivityStatus.NO_ACTIVITY);
            setErrorMessage(`Login error: ${error.message || 'Unknown error'}`);
          }
        } catch (error: any) {
          setActivityStatus(ActivityStatus.NO_ACTIVITY);
          setErrorMessage(`Auth error: ${error.message || 'Unknown error'}`);
        }
      }
      // Case B: No Authentication
      else {
        setActivityStatus(ActivityStatus.CONNECTING_SERVER);
        try {
          const session = await getNetwork().startNonAuthSession(
            host.trim(),
            portNum,
            userName,
            accessLevel,
            probedServerInfo?.readOnly ?? false
          );
          onAuthSessionStarted(session);
        } catch (error: any) {
          setActivityStatus(ActivityStatus.NO_ACTIVITY);
          setErrorMessage(`Login error: ${error.message || 'Unknown error'}`);
        }
      }
    },
    [
      userName,
      passwd,
      accessLevel,
      probedServerInfo,
      onAuthSessionStarted,
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
