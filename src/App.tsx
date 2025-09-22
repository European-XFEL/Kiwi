import React, { useEffect } from "react";
import { Stack } from "@mui/material";

import AppBody from "./components/AppBody";
import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import appTheme from "./AppTheme";

import { initAppSettings } from "./AppSettings";
import { useAppSettingsStore } from "./store/appSettingsStore";
import { useGlobalStore } from "./store/globalAppStateStore"; // ⬅️ NEW

import { AccessLevel } from "./karabo_data/AccessLevel";
import { GuiServerConnector } from "./GuiServerConnector";
import AuthServerClient from "./http_clients/AuthServerClient";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import SceneCanvas from "./components/SceneCanvas";
import NoScenePanel from "./components/NoScenePanel";

const App: React.FC = () => {
  const executedOnceRef = React.useRef("");

  const { setWsProxyUrl, setAuthServerUrl } = useAppSettingsStore();

  const { setError, setLoggedIn, setLoggedOut } = useGlobalStore();

  useEffect(() => {
    const appSettings = initAppSettings();

    setWsProxyUrl(appSettings.wsProxyURL);
    console.log(appSettings.wsProxyURL);
    setAuthServerUrl(appSettings.authServerURL);
    console.log(appSettings.authServerURL);

    if (!executedOnceRef.current) {
      executedOnceRef.current = "true";

      // When session drops unexpectedly → error state
      GuiServerConnector.inst.onSessionDropped = (err_msg: string) => {
        setError(err_msg); //zustand
      };

      // Try to resume GUI session
      GuiServerConnector.inst.resumeGuiSession(
        new AuthServerClient(appSettings.authServerURL),

        // Session resumed
        (
          accessLevel: AccessLevel,
          host: string,
          port: number,
          userId: string,
          topic: string,
          serverVersion: string
        ) => {
          setLoggedIn({
            accessLevel,
            loggedUser: userId,
            guiServerHost: host,
            guiServerPort: port,
            guiServerTopic: topic,
            guiServerVersion: serverVersion,
            sessionStartEpoc: Date.now(),
          }); //zustand
        },

        // No session to resume
        () => {
          setLoggedOut(); //zustand
        },

        // Error trying to resume session
        (errorMsg: string) => {
          setError(errorMsg); //zustand
        }
      );
    }
  }, [setWsProxyUrl, setAuthServerUrl, setError, setLoggedIn, setLoggedOut]);

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline enableColorScheme={true}>
        <Stack direction="column" sx={{ height: "100%", p: 0 }}>
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
