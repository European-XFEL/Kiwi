import { useMemo } from 'react';
import { Card, CardContent, CardFooter } from '@/components/api';
import { Button } from '@/components/api';
import ServerProbeForm from './components/ServerProbeForm';
import AuthenticationForm from './components/AuthenticationForm';
import AccessLevelForm from './components/AccesslevelForm';
import LoginStatus from './components/LoginStatus';
import { useServerProbe } from './hooks/useServerProbe';
import { useAuth } from './hooks/useAuth';
import { ActivityStatus } from './auth.types';
import ReadOnlyAccessForm from './components/ReadOnlyAccessForm';
import { useAppSettingsStore } from '@/store/api';

/**
 * LoginPage - Main login interface
 *
 * Handles:
 * - Server probing (checking if GUI server is available)
 * - User authentication (with or without auth server)
 * - Access level selection (for non-auth mode)
 */
export function LoginPage() {
  const topicServerMapping = useAppSettingsStore(
    (state) => state.topicServerMapping
  );

  // When there's a Topic-Server Map defined the debouncing timeout for launching
  // a GUI Server probe should be as the user won't be typing host and port.
  const debounceServerProbing = topicServerMapping.length > 0 ? 500 : 2_000;

  // Server probe state and logic
  const {
    host,
    port,
    probedServerInfo,
    activityStatus,
    errorMsg,
    setHost,
    setPort,
    doProbeServer,
    setActivityStatus,
    setErrorMessage,
  } = useServerProbe({ debounceMs: debounceServerProbing });

  // Auth state and logic
  const { userName, passwd, setUserName, setPasswd, setAccessLevel, doLogin } =
    useAuth({
      probedServerInfo,
      setActivityStatus,
      setErrorMessage,
    });

  // Status text for loading states
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

  // Login button disabled state
  const isLoginDisabled = useMemo(() => {
    if (activityStatus !== ActivityStatus.NO_ACTIVITY) return true;
    const portNum = parseInt(port, 10);
    if (!host || Number.isNaN(portNum)) return true;

    return probedServerInfo?.authRequired
      ? !userName || !passwd
      : !userName || !probedServerInfo;
  }, [activityStatus, host, port, probedServerInfo, userName, passwd]);

  // Clear error when user makes changes
  const clearError = () => {
    if (errorMsg) setErrorMessage('');
  };

  // Select the correct form to render based on server requirements
  let formContent: React.ReactElement | null = null;
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
        onSubmit={() => doLogin(host, port)}
        disabled={activityStatus !== ActivityStatus.NO_ACTIVITY}
      />
    );
  } else if (probedServerInfo && !probedServerInfo.readOnly) {
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
  } else if (probedServerInfo) {
    formContent = (
      <ReadOnlyAccessForm
        onUserNameChange={(v) => {
          setUserName(v);
          clearError();
        }}
        disabled={activityStatus !== ActivityStatus.NO_ACTIVITY}
      />
    );
  }

  return (
    <Card className="shadow-lg">
      <CardContent className="pt-6 space-y-6">
        <ServerProbeForm
          host={host}
          port={port}
          onHostChange={setHost}
          onPortChange={setPort}
          topicServerSettings={topicServerMapping}
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
          onClick={() => doLogin(host, port)}
          disabled={isLoginDisabled}
          className="min-w-[100px]"
        >
          Login
        </Button>
      </CardFooter>
    </Card>
  );
}
