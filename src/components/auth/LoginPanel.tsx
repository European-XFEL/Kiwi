import React, { useEffect, useRef, useState } from "react";
import { GuiServerConnector } from "@/karabo_connectors/GuiServerConnector";
import { AccessLevel } from "@/karabo_data/SchemaEnums";
import { GuiServerInfo } from "@/karabo_data/GuiServerInfo";
import AuthServerClient from "@/http_clients/AuthServerClient";
import AuthenticationResult from "@/http_data/AuthenticationResult";
import { useAppSettingsStore } from "@/store/appSettingsStore";
import { useGlobalStore } from "@/store/globalAppStateStore";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import ServerProbeForm from "./ServerProbeForm";
import AuthenticationForm from "./AuthenticationForm";
import AccessLevelForm from "./AccesslevelForm";
import LoginStatus from "./LoginStatus";

enum ActivityStatus {
  NO_ACTIVITY,
  PROBING_SERVER,
  CONNECTING_SERVER,
  AUTH_USER,
}

const LoginPanel: React.FC = () => {
  const setLoggedIn = useGlobalStore((s) => s.setLoggedIn);
  const navigate = useNavigate();

  const [activityStatus, setActivityStatus] = useState<ActivityStatus>(
    ActivityStatus.NO_ACTIVITY
  );
  const [errorMsg, setErrorMessage] = useState("");
  const [probedServerInfo, setProbedServerInfo] =
    useState<GuiServerInfo | null>(null);

  const [userName, setUserName] = useState("");
  const [passwd, setPasswd] = useState("");
  const [accessLevel, setAccessLevel] = useState(0);

  // Keep inputs as controlled strings to avoid NaN while typing
  const [host, setHost] = useState<string>("localhost");
  const [port, setPort] = useState<string>("44444");

  const { authServerURL } = useAppSettingsStore();
  const authServerURLRef = useRef("");
  const didInitialProbeRef = useRef(false);
  const debounceMs = 2000;

  const onProbeSuccess = (serverInfo: GuiServerInfo) => {
    setProbedServerInfo(serverInfo);
    setErrorMessage("");
    setActivityStatus(ActivityStatus.NO_ACTIVITY);
  };

  const onProbeFailure = (errMsg: string) => {
    setErrorMessage(errMsg);
    setActivityStatus(ActivityStatus.NO_ACTIVITY);
    setProbedServerInfo(null);
  };

  const doProbeServer = (h: string, pNum: number) => {
    if (!h || !Number.isFinite(pNum) || pNum <= 0 || pNum > 65535) return;
    setActivityStatus(ActivityStatus.PROBING_SERVER);
    GuiServerConnector.inst.probeServer(
      h,
      pNum,
      onProbeSuccess,
      onProbeFailure
    );
  };

  // Initial mount: load saved host/port and probe immediately
  useEffect(() => {
    if (!authServerURLRef.current) authServerURLRef.current = authServerURL;

    if (!didInitialProbeRef.current) {
      const savedHost = localStorage.getItem("lastHost") || "localhost";
      const savedPort = localStorage.getItem("lastPort") || "44444";
      setHost(savedHost);
      setPort(savedPort);

      const pNum = parseInt(savedPort, 10);
      didInitialProbeRef.current = true;
      doProbeServer(savedHost, Number.isNaN(pNum) ? 0 : pNum);
    }
  }, [authServerURL]);

  // Debounce probe whenever host/port change
  useEffect(() => {
    const pNum = parseInt(port, 10);
    if (!host || Number.isNaN(pNum)) return; // wait for valid input

    const id = window.setTimeout(() => {
      doProbeServer(host.trim(), pNum);
    }, debounceMs);

    return () => window.clearTimeout(id);
  }, [host, port]);

  const authenticateUser = async (): Promise<AuthenticationResult> => {
    const authCli = new AuthServerClient(authServerURLRef.current);
    return await authCli.authenticateUser({
      username: userName,
      password: passwd,
    });
  };

  const onAuthSessionStarted = (
    accessLevel: AccessLevel,
    host: string,
    port: number,
    topic: string,
    serverVersion: string
  ) => {
    localStorage.setItem("lastHost", host);
    localStorage.setItem("lastPort", `${port}`);
    setActivityStatus(ActivityStatus.NO_ACTIVITY);

    setLoggedIn({
      accessLevel,
      loggedUser: userName,
      guiServerHost: host,
      guiServerPort: port,
      guiServerTopic: topic,
      guiServerVersion: serverVersion,
      sessionStartEpoc: Date.now(),
    });

    navigate("no_scene");
  };

  const onSessionStartFailure = (errMsg: string) => {
    setActivityStatus(ActivityStatus.NO_ACTIVITY);
    setErrorMessage(`Login error: ${errMsg}`);
  };

  const doLogin = () => {
    const portNum = parseInt(port, 10);
    if (!host || Number.isNaN(portNum)) return;

    if (probedServerInfo?.authRequired) {
      setActivityStatus(ActivityStatus.AUTH_USER);
      authenticateUser()
        .then((authResult) => {
          setActivityStatus(ActivityStatus.NO_ACTIVITY);
          if (!authResult.success) {
            setErrorMessage(`Auth error: ${authResult.error_msg!}`);
          } else {
            setActivityStatus(ActivityStatus.CONNECTING_SERVER);
            GuiServerConnector.inst.startAuthSession(
              host.trim(),
              portNum,
              userName,
              authResult.once_token!,
              authResult.refresh_token!,
              onAuthSessionStarted,
              onSessionStartFailure
            );
          }
        })
        .catch((error) => {
          setActivityStatus(ActivityStatus.NO_ACTIVITY);
          setErrorMessage(`Auth error: ${error.message}`);
        });
    } else {
      setActivityStatus(ActivityStatus.CONNECTING_SERVER);
      GuiServerConnector.inst.startNonAuthSession(
        host.trim(),
        portNum,
        userName,
        accessLevel,
        onAuthSessionStarted,
        onSessionStartFailure
      );
    }
  };

  const getStatusText = () => {
    switch (activityStatus) {
      case ActivityStatus.AUTH_USER:
        return "Authenticating user...";
      case ActivityStatus.CONNECTING_SERVER:
        return "Connecting to GUI Server...";
      case ActivityStatus.PROBING_SERVER:
        return "Probing GUI Server...";
      default:
        return "";
    }
  };

  const isLoginDisabled = () => {
    if (activityStatus !== ActivityStatus.NO_ACTIVITY) return true;
    const portNum = parseInt(port, 10);
    if (!host || Number.isNaN(portNum)) return true;

    if (probedServerInfo?.authRequired) {
      return !userName || !passwd;
    }
    return !userName || !probedServerInfo;
  };

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
          // immediate probe on blur (nice UX):
          onCommit={(h, p) => {
            const pNum = parseInt(p, 10);
            if (!Number.isNaN(pNum)) doProbeServer(h.trim(), pNum);
          }}
        />

        {probedServerInfo?.authRequired ? (
          <AuthenticationForm
            onUserNameChange={(name) => {
              setUserName(name);
              if (errorMsg) setErrorMessage("");
            }}
            onPasswordChange={(pwd) => {
              setPasswd(pwd);
              if (errorMsg) setErrorMessage("");
            }}
            onSubmit={doLogin}
            disabled={activityStatus !== ActivityStatus.NO_ACTIVITY}
          />
        ) : (
          probedServerInfo && (
            <AccessLevelForm
              onUserNameChange={(name) => {
                setUserName(name);
                if (errorMsg) setErrorMessage("");
              }}
              onAccessLevelChange={setAccessLevel}
              disabled={activityStatus !== ActivityStatus.NO_ACTIVITY}
            />
          )
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <div className="flex-1">
          <LoginStatus
            isLoading={activityStatus !== ActivityStatus.NO_ACTIVITY}
            loadingText={getStatusText()}
            error={errorMsg}
          />
        </div>
        <Button
          onClick={doLogin}
          disabled={isLoginDisabled()}
          className="min-w-[100px]"
        >
          Login
        </Button>
      </CardFooter>
    </Card>
  );
};

export default LoginPanel;
