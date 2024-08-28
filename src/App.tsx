import React, { useEffect } from "react";

import { Stack } from "@mui/material";

import AppBody from "./components/AppBody";

import { CssBaseline } from "@mui/material";

import { ThemeProvider } from "@mui/material/styles";
import appTheme from "./AppTheme";

import { useAppDispatch } from "./AppHooks";
import type { AppSettings } from "./AppSettings";
import { initAppSettings } from "./AppSettings";
import {
  setWsProxyUrl,
  setAuthServerUrl,
} from "./store/slices/appSettingsSlice";
import {
  setError,
  setLoggedOut,
  setLoggedIn,
} from "./store/slices/globalAppStateSlice";
import { AccessLevel } from "./karabo_data/AccessLevel";
import { GuiServerConnector } from "./GuiServerConnector";
import AuthServerClient from "./http_clients/AuthServerClient";

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const resumedGuiSessionRef = React.useRef("");

  useEffect(() => {
    initAppSettings()
      .then((settings: AppSettings) => {
        dispatch(setWsProxyUrl(settings.wsProxyURL));
        dispatch(setAuthServerUrl(settings.authServerURL));

        if (!resumedGuiSessionRef.current) {
          // First execution of useEffect since appStart - this is needed to
          // prevent duplicate execution of useEffect when React.StrictMode is enabled.
          // See https://react.dev/reference/react/useEffect#caveats for more info
          // The resume GUI Session logic must be executed only once per
          // activation of the application. Duplicate execution generates refresh-token
          // that won't be used and causes sync to be lost between the refresh-token
          // actually being sent to the server and the one stored in the LocalStorage.
          resumedGuiSessionRef.current = "true";

          GuiServerConnector.inst.resumeGuiSession(
            new AuthServerClient(settings.authServerURL),
            // Handles session resume
            (
              accessLevel: AccessLevel,
              host: string,
              port: number,
              userId: string,
              topic: string,
              serverVersion: string
            ) => {
              dispatch(
                setLoggedIn({
                  accessLevel: accessLevel,
                  loggedUser: userId,
                  guiServerHost: host,
                  guiServerPort: port,
                  guiServerTopic: topic,
                  guiServerVersion: serverVersion,
                  sessionStartEpoc: Date.now(),
                })
              );
            },
            // Handles no session to resume
            () => {
              dispatch(setLoggedOut());
            },
            // Handles error trying to resume a session
            (errorMsg: string) => {
              dispatch(setError(errorMsg));
            }
          );
        } // (if (!resumedGuiSessionRef))
      })
      .catch((error) => {
        dispatch(
          setError(
            `Could not retrieve configuration information from the FacilityInfo server: '${error.message}'`
          )
        );
      });
  }, [dispatch]);

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline enableColorScheme={true}>
        <Stack direction="column" sx={{ height: "100%", p: 1.5 }}>
          <AppBody />
        </Stack>
      </CssBaseline>
    </ThemeProvider>
  );
};

export default App;
