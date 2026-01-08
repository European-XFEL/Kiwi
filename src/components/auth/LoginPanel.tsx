import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { getNetwork } from '@/singletons/api';
import { AccessLevel } from '@/karabo_data/SchemaEnums';
import { GuiServerInfo } from '@/karabo_data/GuiServerInfo';
import AuthServerClient from '@/http/AuthServerClient';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { useGlobalStore } from '@/store/globalAppStateStore';

import { Card, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import ServerProbeForm from './ServerProbeForm';
import AuthenticationForm from './AuthenticationForm';
import AccessLevelForm from './AccesslevelForm';
import LoginStatus from './LoginStatus';

enum ActivityStatus {
  NO_ACTIVITY,
  PROBING_SERVER,
  CONNECTING_SERVER,
  AUTH_USER,
}

const DEBOUNCE_MS = 2000;

const LoginPanel: React.FC = () => {
  const setLoggedIn = useGlobalStore((s) => s.setLoggedIn);
  const { authServerURL } = useAppSettingsStore();
  const navigate = useNavigate();

  const [activityStatus, setActivityStatus] = useState<ActivityStatus>(
    ActivityStatus.NO_ACTIVITY
  );
  const [errorMsg, setErrorMessage] = useState('');
  const [probedServerInfo, setProbedServerInfo] =
    useState<GuiServerInfo | null>(null);

  const [userName, setUserName] = useState('');
  const [passwd, setPasswd] = useState('');
  const [accessLevel, setAccessLevel] = useState(0);

  const [host, setHost] = useState<string>('localhost');
  const [port, setPort] = useState<string>('44444');

  const authServerURLRef = useRef('');
  const didInitialProbeRef = useRef(false);

  // --- 1. Network Callbacks ---

  const onProbeSuccess = useCallback((serverInfo: GuiServerInfo) => {
    setProbedServerInfo(serverInfo);
    setErrorMessage('');
    setActivityStatus(ActivityStatus.NO_ACTIVITY);
  }, []);

  const onProbeFailure = useCallback((errMsg: string) => {
    setErrorMessage(errMsg);
    setActivityStatus(ActivityStatus.NO_ACTIVITY);
    setProbedServerInfo(null);
  }, []);

  const doProbeServer = useCallback(
    (h: string, pNum: number) => {
      if (!h || !Number.isFinite(pNum) || pNum <= 0 || pNum > 65535) return;
      setActivityStatus(ActivityStatus.PROBING_SERVER);
      getNetwork().probeServer(h, pNum, onProbeSuccess, onProbeFailure);
    },
    [onProbeSuccess, onProbeFailure]
  );

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
    [userName, setLoggedIn, navigate]
  );

  const onSessionStartFailure = useCallback((errMsg: string) => {
    setActivityStatus(ActivityStatus.NO_ACTIVITY);
    setErrorMessage(`Login error: ${errMsg}`);
  }, []);

  // --- 2. Login Logic ---

  const doLogin = useCallback(async () => {
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
  }, [
    host,
    port,
    userName,
    passwd,
    accessLevel,
    probedServerInfo,
    onAuthSessionStarted,
    onSessionStartFailure,
  ]);

  // --- 3. Effects ---

  // Initial Probe (Runs once)
  useEffect(() => {
    if (!authServerURLRef.current) authServerURLRef.current = authServerURL;

    if (!didInitialProbeRef.current) {
      const savedHost = localStorage.getItem('lastHost') || 'localhost';
      const savedPort = localStorage.getItem('lastPort') || '44444';
      setHost(savedHost);
      setPort(savedPort);

      const pNum = parseInt(savedPort, 10);
      didInitialProbeRef.current = true;
      doProbeServer(savedHost, Number.isNaN(pNum) ? 0 : pNum);
    }
  }, [authServerURL, doProbeServer]);

  // Debounce Probe (Runs on typing)
  useEffect(() => {
    const pNum = parseInt(port, 10);
    if (!host || Number.isNaN(pNum)) return;

    const id = window.setTimeout(() => {
      doProbeServer(host.trim(), pNum);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(id);
  }, [host, port, doProbeServer]);

  // --- 4. Render Helpers ---

  const statusText = useMemo(() => {
    switch (activityStatus) {
      case ActivityStatus.AUTH_USER:
        return 'Authenticating user...';
      case ActivityStatus.CONNECTING_SERVER:
        return 'Connecting to GUI Server...';
      case ActivityStatus.PROBING_SERVER:
        return 'Probing GUI Server...';
      default:
        return '';
    }
  }, [activityStatus]);

  const isLoginDisabled = useMemo(() => {
    if (activityStatus !== ActivityStatus.NO_ACTIVITY) return true;
    const portNum = parseInt(port, 10);
    if (!host || Number.isNaN(portNum)) return true;

    return probedServerInfo?.authRequired
      ? !userName || !passwd
      : !userName || !probedServerInfo;
  }, [activityStatus, host, port, probedServerInfo, userName, passwd]);

  const clearError = () => {
    if (errorMsg) setErrorMessage('');
  };

  // Select the correct form to render
  let formContent = null;
  if (probedServerInfo?.authRequired) {
    formContent = (
      <AuthenticationForm
        onUserNameChange={(v) => {
          setUserName(v);
          clearError();
        }}
        onPasswordChange={(v) => {
          setPasswd(v);
          clearError();
        }}
        onSubmit={doLogin}
        disabled={activityStatus !== ActivityStatus.NO_ACTIVITY}
      />
    );
  } else if (probedServerInfo) {
    formContent = (
      <AccessLevelForm
        onUserNameChange={(v) => {
          setUserName(v);
          clearError();
        }}
        onAccessLevelChange={setAccessLevel}
        disabled={activityStatus !== ActivityStatus.NO_ACTIVITY}
      />
    );
  }

  // --- Main Render ---

  return (
    <Card className="shadow-lg">
      <CardContent className="pt-6 space-y-6">
        <ServerProbeForm
          host={host}
          port={port}
          onHostChange={setHost}
          onPortChange={setPort}
          topic={probedServerInfo?.topic}
          disabled={activityStatus !== ActivityStatus.NO_ACTIVITY}
          onCommit={(h, p) => {
            const pNum = parseInt(p, 10);
            if (!Number.isNaN(pNum)) doProbeServer(h.trim(), pNum);
          }}
        />

        {formContent}
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <div className="flex-1">
          <LoginStatus
            isLoading={activityStatus !== ActivityStatus.NO_ACTIVITY}
            loadingText={statusText}
            error={errorMsg}
          />
        </div>
        <Button
          onClick={doLogin}
          disabled={isLoginDisabled}
          className="min-w-[100px]"
        >
          Login
        </Button>
      </CardFooter>
    </Card>
  );
};

export default LoginPanel;
