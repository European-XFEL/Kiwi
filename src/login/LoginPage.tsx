import { useMemo } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ServerProbeForm from './components/ServerProbeForm';
import AuthenticationForm from './components/AuthenticationForm';
import AccessLevelForm from './components/AccesslevelForm';
import LoginStatus from './components/LoginStatus';
import { useServerProbe } from './hooks/useServerProbe';
import { useAuth } from './hooks/useAuth';
import { ActivityStatus } from './types/auth.types';

/**
 * LoginPage - Main login interface
 *
 * Handles:
 * - Server probing (checking if GUI server is available)
 * - User authentication (with or without auth server)
 * - Access level selection (for non-auth mode)
 */
export function LoginPage() {
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
  } = useServerProbe();

  // Auth state and logic
  const {
    userName,
    passwd,
    accessLevel,
    setUserName,
    setPasswd,
    setAccessLevel,
    doLogin,
  } = useAuth({
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
        onSubmit={() => doLogin(host, port)}
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
