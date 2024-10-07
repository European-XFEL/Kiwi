import React, { useEffect } from "react";

import { Stack } from "@mui/material";

import AppBody from "./components/AppBody";

import { CssBaseline } from "@mui/material";

import { ThemeProvider } from "@mui/material/styles";
import appTheme from "./AppTheme";

import { useAppDispatch } from "./AppHooks";
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
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import SceneCanvas from "./components/SceneCanvas";
import NoScenePanel from "./components/NoScenePanel";

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const executedOnceRef = React.useRef("");

  useEffect(() => {
    const appSettings = initAppSettings();
    dispatch(setWsProxyUrl(appSettings.wsProxyURL));
    dispatch(setAuthServerUrl(appSettings.authServerURL));

    if (!executedOnceRef.current) {
      // First execution of useEffect since appStart - this is needed to
      // prevent duplicate execution of useEffect when React.StrictMode is enabled.
      // See https://react.dev/reference/react/useEffect#caveats for more info
      // The resume GUI Session logic must be executed only once per
      // activation of the application. Duplicate execution generates refresh-token
      // that won't be used and causes sync to be lost between the refresh-token
      // actually being sent to the server and the one stored in the LocalStorage.
      // The same single-execution constraint also applies to the definiton of the
      // handler for the onSessionDropped event.
      executedOnceRef.current = "true";

      GuiServerConnector.inst.onSessionDropped = (err_msg: string) => {
        // Goes to error state when an unexpected GUI session drop occurs.
        dispatch(setError(err_msg));
      };

      GuiServerConnector.inst.resumeGuiSession(
        new AuthServerClient(appSettings.authServerURL),
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
    }
  }, [dispatch]);

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline enableColorScheme={true}>
        <Stack direction="column" sx={{ height: "100%", p: 1.5 }}>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AppBody />}>
                <Route path="scene" element={<SceneCanvas />} />
                <Route path="no_scene" element={<NoScenePanel />} />
              </Route>
              {/* By default go to the no-scene loaded page */}
              <Route index element={<Navigate replace to="no_scene" />} />
              {/* Any unsupported URL should redirect to the no-scene page */}
              <Route path="*" element={<Navigate replace to="no_scene" />} />
            </Routes>
          </BrowserRouter>
        </Stack>
      </CssBaseline>
    </ThemeProvider>
  );
};

export default App;
