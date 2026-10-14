import { useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/api';
import { Button } from '@/components/api';
import { getConfig } from '@/lib/singletons/api';
import HostPortForm from './components/HostPortForm';
import TopicSelectForm from './components/TopicSelectForm';
import AuthenticationForm from './components/AuthenticationForm';
import AccessLevelForm from './components/AccesslevelForm';
import LoginStatus from './components/LoginStatus';
import { useAuth } from './hooks/useAuth';
import { ActivityStatus, GuiServerType, ServerProbeResult } from './auth.types';
import { LoginContext } from './LoginContext';
import { decodeTopicServerMap } from './utils';
import ReadOnlyAccessForm from './components/ReadOnlyAccessForm';
import { useApplicationModeStore, useAppSettingsStore } from '@/store/api';

/**
 * LoginPage - Main login interface
 *
 * Handles:
 * - Selecting the server form and reacting to its probe results
 * - User authentication (with or without auth server)
 * - Access level selection (for non-auth mode)
 */
export function LoginPage() {
  const { mode, launch } = useApplicationModeStore();
  const suppliedServer = mode === 'cinema' && launch?.host !== undefined;
  const topicServerMapping = useAppSettingsStore(
    (state) => state.topicServerMapping
  );

  const topicServerMap = useMemo(
    () =>
      mode === 'cinema' ? undefined : decodeTopicServerMap(topicServerMapping),
    [mode, topicServerMapping]
  );
  const hasTopicServerMap =
    topicServerMap && Object.keys(topicServerMap).length > 0;
  const [host, setHost] = useState(() =>
    suppliedServer ? launch.host! : getConfig().lastHost
  );
  const [port, setPort] = useState(() => {
    const initialPort = suppliedServer ? launch.port : getConfig().lastPort;
    return initialPort ? String(initialPort) : '';
  });
  const [probeResult, setProbeResult] = useState<ServerProbeResult>({
    status: 'idle',
  });
  const probedServerInfo =
    probeResult.status === 'success' ? probeResult.serverInfo : null;
  const [activityStatus, setActivityStatus] = useState(
    ActivityStatus.NO_ACTIVITY
  );
  const [loginError, setErrorMessage] = useState('');
  const errorMsg =
    probeResult.status === 'failure'
      ? probeResult.error instanceof Error
        ? probeResult.error.message
        : String(probeResult.error)
      : loginError;
  const guiServerType = probedServerInfo
    ? probedServerInfo.authRequired
      ? GuiServerType.AUTH
      : probedServerInfo.readOnly
        ? GuiServerType.READ_ONLY
        : GuiServerType.NON_AUTH
    : null;

  // Auth state and logic
  const {
    userName,
    passwd,
    accessLevel,
    setUserName,
    setPasswd,
    setAccessLevel,
    doLogin,
    doConnectObserver,
  } = useAuth({
    probedServerInfo,
    setActivityStatus,
    setErrorMessage,
  });

  const handleUserNameChange = useCallback(
    (name: string) => {
      setUserName(name);
      setErrorMessage('');
    },
    [setUserName]
  );

  const handlePasswordChange = useCallback(
    (password: string) => {
      setPasswd(password);
      setErrorMessage('');
    },
    [setPasswd]
  );

  const handleProbeResult = useCallback((result: ServerProbeResult) => {
    setProbeResult(result);
    setErrorMessage('');
  }, []);

  // Status text for loading states
  let statusText = '';
  switch (activityStatus) {
    case ActivityStatus.AUTH_USER:
      statusText = 'Authenticating user...';
      break;
    case ActivityStatus.CONNECTING_SERVER:
      statusText = 'Connecting to GUI Server...';
      break;
    case ActivityStatus.PROBING_SERVER:
      statusText = 'Probing GUI Server...';
      break;
  }

  // Login button disabled state
  const portNum = Number(port);
  const isLoginDisabled =
    activityStatus !== ActivityStatus.NO_ACTIVITY ||
    !host.trim() ||
    !Number.isInteger(portNum) ||
    portNum <= 0 ||
    portNum > 65535 ||
    (guiServerType === GuiServerType.AUTH
      ? !userName || !passwd
      : !userName || !probedServerInfo);

  // Select the correct form to render based on server requirements
  let formContent: React.ReactElement | null = null;
  if (guiServerType === GuiServerType.AUTH) {
    formContent = (
      <AuthenticationForm
        onConnectObserver={() => doConnectObserver(host, port)}
        onSubmit={() => doLogin(host, port)}
      />
    );
  } else if (guiServerType === GuiServerType.NON_AUTH) {
    formContent = <AccessLevelForm />;
  } else if (guiServerType === GuiServerType.READ_ONLY) {
    formContent = <ReadOnlyAccessForm onSubmit={() => doLogin(host, port)} />;
  }

  return (
    <LoginContext.Provider
      value={{
        host,
        port,
        userName,
        password: passwd,
        userAccessLevel: accessLevel,
        guiServerType,
        probeResult,
        activityStatus,
        setHost,
        setPort,
        setUserName: handleUserNameChange,
        setPassword: handlePasswordChange,
        setUserAccessLevel: setAccessLevel,
        setProbeResult: handleProbeResult,
        setActivityStatus,
      }}
    >
      <Card data-testid="login-page" className="shadow-lg">
        <CardContent className="pt-2 space-y-5">
          {hasTopicServerMap ? (
            <TopicSelectForm
              key={topicServerMapping}
              topicServerMap={topicServerMap}
            />
          ) : (
            <HostPortForm />
          )}

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
            data-testid="login-submit"
            onClick={() => doLogin(host, port)}
            disabled={isLoginDisabled}
            className="min-w-[100px]"
          >
            Login
          </Button>
        </CardFooter>
      </Card>
    </LoginContext.Provider>
  );
}
