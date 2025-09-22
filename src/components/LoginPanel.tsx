import React, { useEffect } from "react";
import { useEffect as useReactEffect, useRef, useState } from "react";

import { GuiServerConnector } from "../GuiServerConnector";

import { AccessLevel } from "../karabo_data/AccessLevel";
import { GuiServerInfo } from "../karabo_data/GuiServerInfo";

import AuthServerClient from "../http_clients/AuthServerClient";
import AuthenticationResult from "../http_data/AuthenticationResult";
import { useAppSettingsStore } from "../store/appSettingsStore";
import { useGlobalStore } from "../store/globalAppStateStore";

import {
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  TextField,
  CircularProgress,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  InputAdornment,
  OutlinedInput,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

enum ActivityStatus {
  NO_ACTIVITY,
  PROBING_SERVER,
  CONNECTING_SERVER,
  AUTH_USER,
}

const LoginPanel: React.FC = () => {
  const setLoggedIn = useGlobalStore((s) => s.setLoggedIn);

  // After a successful login, navigate to "no_scene"
  const navigate = useNavigate();

  //
  // Panel state
  //
  const [activityStatus, setActivityStatus] = useState<ActivityStatus>(
    ActivityStatus.NO_ACTIVITY
  );
  const [errorMsg, setErrorMessage] = useState("");
  const [probedServerInfo, setProbedServerInfo] =
    useState<GuiServerInfo | null>(null);
  const [userName, setUserName] = useState("");
  const [passwd, setPasswd] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { authServerURL } = useAppSettingsStore();

  //
  // Refs to DOM elements
  //
  const hostRef = useRef<HTMLInputElement>(null);
  const portRef = useRef<HTMLInputElement>(null);
  const userRef = useRef<HTMLInputElement>(null);
  const accessLevelRef = useRef<HTMLInputElement>(null);
  const passwdRef = useRef<HTMLInputElement>(null);
  const loginRef = useRef<HTMLButtonElement>(null);

  // Refs to values preserved between renders
  const authServerURLRef = useRef("");

  //
  // ProbeServer success and error handlers.
  //
  const onProbeSuccess = (serverInfoHash: GuiServerInfo) => {
    setProbedServerInfo(serverInfoHash);
    setErrorMessage("");
    setActivityStatus(ActivityStatus.NO_ACTIVITY);
  };

  const onProbeFailure = (errMsg: string) => {
    if (latchTimerID != 0) {
      // Next probe may succeed; suppress intermediate error
      return;
    }
    setErrorMessage(errMsg);
    setActivityStatus(ActivityStatus.NO_ACTIVITY);
    setProbedServerInfo(null);
  };

  const doProbeServer = () => {
    const hostValue = hostRef.current!.value.trim();
    const portValue = parseInt(portRef.current!.value);
    if (!hostValue || !portValue) return;

    setActivityStatus(ActivityStatus.PROBING_SERVER);
    latchTimerID = 0;
    GuiServerConnector.inst.probeServer(
      hostValue,
      portValue,
      onProbeSuccess,
      onProbeFailure
    );
  };

  //
  // Panel initialization
  //
  useEffect(() => {
    // TODO: The authServerURL value SHOULD come from the probed server info
    if (!authServerURLRef.current) {
      authServerURLRef.current = authServerURL;

      const host = localStorage.getItem("lastHost") || "localhost";
      let port = 44444;
      const lastPort = parseInt(localStorage.getItem("lastPort") || "");
      if (!isNaN(lastPort)) port = lastPort;

      if (hostRef.current) {
        hostRef.current.value = host;
        hostRef.current.focus();
      }
      if (portRef.current) {
        portRef.current.value = `${port}`;
      }

      setActivityStatus(ActivityStatus.PROBING_SERVER);
      GuiServerConnector.inst.probeServer(
        host,
        port,
        onProbeSuccess,
        onProbeFailure
      );
    } else {
      if (
        userRef.current &&
        probedServerInfo &&
        (document.activeElement === hostRef.current ||
          document.activeElement === portRef.current)
      ) {
        userRef.current.focus();
      }
    }
  }, [probedServerInfo, authServerURL]);

  let latchTimerID = 0;

  const onHostnameChanged = (_e: React.ChangeEvent<HTMLInputElement>) => {
    if (latchTimerID != 0) clearTimeout(latchTimerID);
    latchTimerID = window.setTimeout(doProbeServer, 900);
  };

  const onPortChanged = (_e: React.ChangeEvent<HTMLInputElement>) => {
    if (latchTimerID != 0) clearTimeout(latchTimerID);
    latchTimerID = window.setTimeout(doProbeServer, 900);
  };

  //
  // User login (with and without authentication)
  //
  const doLogin = () => {
    const hostValue = hostRef.current!.value.trim();
    const portValue = parseInt(portRef.current!.value);

    if (probedServerInfo?.authRequired) {
      setActivityStatus(ActivityStatus.AUTH_USER);
      authenticateUser()
        .then((authResult: AuthenticationResult) => {
          setActivityStatus(ActivityStatus.NO_ACTIVITY);
          if (!authResult.success) {
            setErrorMessage(`Auth error: ${authResult.error_msg!}`);
          } else {
            const once_token = authResult.once_token!;
            const refresh_token = authResult.refresh_token!;
            setActivityStatus(ActivityStatus.CONNECTING_SERVER);
            GuiServerConnector.inst.startAuthSession(
              hostValue,
              portValue,
              userName,
              once_token,
              refresh_token,
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
      const accessLevel = parseInt(accessLevelRef.current!.value);
      setActivityStatus(ActivityStatus.CONNECTING_SERVER);
      GuiServerConnector.inst.startNonAuthSession(
        hostValue,
        portValue,
        userName,
        accessLevel,
        onNonAuthSessionStarted,
        onSessionStartFailure
      );
    }
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

  const onNonAuthSessionStarted = (
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

  const authenticateUser = async (): Promise<AuthenticationResult> => {
    const authCli = new AuthServerClient(authServerURLRef.current);
    const authRes = await authCli.authenticateUser({
      username: userName,
      password: passwd,
    });
    return authRes;
  };

  //
  // Rendering helpers
  //
  const renderStatusBox = () => {
    if (errorMsg) {
      return (
        <Box sx={{ flexGrow: 1, p: 1, color: "error.main" }}>
          <Typography variant="body2">{errorMsg}</Typography>
        </Box>
      );
    }

    let statusText = "";
    let inProgress = false;

    switch (activityStatus) {
      case ActivityStatus.AUTH_USER:
        statusText = "Authenticating user ...";
        inProgress = true;
        break;
      case ActivityStatus.CONNECTING_SERVER:
        statusText = "Connecting to GUI Server ...";
        inProgress = true;
        break;
      case ActivityStatus.PROBING_SERVER:
        inProgress = true;
        statusText = "Probing GUI Server ...";
        break;
    }

    if (inProgress) {
      return (
        <>
          <CircularProgress size={24} />
          <Box sx={{ flexGrow: 1, p: 1 }}>
            <Typography variant="body2">{statusText}</Typography>
          </Box>
        </>
      );
    } else {
      return (
        <Box sx={{ flexGrow: 1, p: 1 }}>
          <Typography variant="body2">{statusText}</Typography>
        </Box>
      );
    }
  };

  const renderTopicLabel = () => {
    if (probedServerInfo && probedServerInfo.topic) {
      return <Box>Topic: {probedServerInfo.topic}</Box>;
    } else {
      return <Box />;
    }
  };

  const renderLoginButton = () => {
    let disabled = true;
    if (activityStatus === ActivityStatus.NO_ACTIVITY) {
      if (probedServerInfo?.authRequired && userName && passwd) {
        disabled = false;
      } else if (
        probedServerInfo &&
        !probedServerInfo.authRequired &&
        userName
      ) {
        disabled = false;
      }
    }
    if (disabled) {
      return (
        <Button ref={loginRef} variant="contained" disabled>
          Login
        </Button>
      );
    } else {
      return (
        <Button
          ref={loginRef}
          variant="contained"
          onClick={() => {
            doLogin();
          }}
          sx={{ minWidth: "5em" }}
        >
          Login
        </Button>
      );
    }
  };

  const renderCredentialsPanel = () => {
    if (probedServerInfo && probedServerInfo.authRequired) {
      return (
        <>
          <Box>USER AUTHENTICATION</Box>
          <Paper elevation={3} sx={{ padding: "1.2em" }}>
            <Grid container spacing={2} sx={{ alignItems: "flex-end" }}>
              <Grid item xs={12}>
                <TextField
                  label="Username"
                  inputRef={userRef}
                  variant="outlined"
                  size="medium"
                  sx={{ width: "100%" }}
                  onChange={() => {
                    if (errorMsg) setErrorMessage("");
                    setUserName(userRef.current!.value);
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl variant="outlined">
                  <InputLabel htmlFor="outlined-adornment-password">
                    Password
                  </InputLabel>
                  <OutlinedInput
                    label="Password"
                    inputRef={passwdRef}
                    size="medium"
                    type={showPassword ? "text" : "password"}
                    sx={{ width: "100%" }}
                    onChange={() => {
                      if (errorMsg) setErrorMessage("");
                      setPasswd(passwdRef.current!.value);
                    }}
                    onKeyUp={(evt: React.KeyboardEvent<HTMLInputElement>) => {
                      if (evt.key === "Enter" && !loginRef.current!.disabled) {
                        doLogin();
                      }
                    }}
                    endAdornment={
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => {
                            setShowPassword(!showPassword);
                          }}
                          onMouseDown={(
                            evt: React.MouseEvent<HTMLButtonElement>
                          ) => {
                            evt.preventDefault();
                          }}
                          edge="end"
                        >
                          {showPassword ? <Visibility /> : <VisibilityOff />}
                        </IconButton>
                      </InputAdornment>
                    }
                  />
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        </>
      );
    } else if (probedServerInfo) {
      return (
        <>
          <Box>ACCESS LEVEL LOGIN</Box>
          <Paper elevation={3} sx={{ padding: "1.2em" }}>
            <Grid container spacing={2} sx={{ alignItems: "flex-end" }}>
              <Grid item xs={12}>
                <TextField
                  label="Username"
                  inputRef={userRef}
                  variant="outlined"
                  size="medium"
                  sx={{ width: "100%" }}
                  onChange={() => {
                    if (errorMsg) setErrorMessage("");
                    setUserName(userRef.current!.value);
                  }}
                />
              </Grid>
              <Grid item xs={4}>
                <FormControl
                  variant="outlined"
                  sx={{ width: "100%" }}
                  size="medium"
                >
                  <InputLabel id="access_level_label">Access Level</InputLabel>
                  <Select
                    labelId="access_level_label"
                    label="Access Level"
                    inputRef={accessLevelRef}
                  >
                    <MenuItem value="0">{AccessLevel[0]}</MenuItem>
                    <MenuItem value="1">{AccessLevel[1]}</MenuItem>
                    <MenuItem value="2">{AccessLevel[2]}</MenuItem>
                    <MenuItem value="3">{AccessLevel[3]}</MenuItem>
                    <MenuItem value="4">{AccessLevel[4]}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        </>
      );
    }
    return null;
  };

  //
  // Render
  //
  return (
    <Paper elevation={8} sx={{ padding: "0.5em" }}>
      <Stack spacing={0.2} sx={{ marginBottom: 3, p: 1 }}>
        <Box>GUI SERVER</Box>
        <Paper elevation={3} sx={{ padding: "1.2em" }}>
          <Grid container spacing={2} sx={{ alignItems: "flex-end" }}>
            <Grid item xs={12}>
              <TextField
                label="Hostname"
                inputRef={hostRef}
                variant="outlined"
                size="medium"
                sx={{ width: "100%" }}
                onChange={onHostnameChanged}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Port"
                inputRef={portRef}
                variant="outlined"
                type="number"
                size="medium"
                sx={{ width: "100%" }}
                onChange={onPortChanged}
              />
            </Grid>
            <Grid item xs={8} sx={{ width: "100%", textAlign: "right" }}>
              {renderTopicLabel()}
            </Grid>
          </Grid>
        </Paper>
      </Stack>

      <Stack spacing={0.2} sx={{ p: 1, marginBottom: 3 }}>
        {renderCredentialsPanel()}
      </Stack>

      <Box
        sx={{
          p: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          {renderStatusBox()}
        </Box>
        {renderLoginButton()}
      </Box>
    </Paper>
  );
};

export default LoginPanel;
