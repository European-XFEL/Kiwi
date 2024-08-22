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
import { setError, setLoggedOut } from "./store/slices/globalAppStateSlice";

const App: React.FC = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    initAppSettings()
      .then((settings: AppSettings) => {
        dispatch(setWsProxyUrl(settings.wsProxyURL));
        dispatch(setAuthServerUrl(settings.authServerURL));
        dispatch(setLoggedOut());
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
