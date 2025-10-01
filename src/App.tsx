import React, { useEffect } from "react";
import { initAppSettings } from "./AppSettings";
import { useAppSettingsStore } from "./store/appSettingsStore";
import { useGlobalStore } from "./store/globalAppStateStore";
import { AccessLevel } from "./karabo_data/AccessLevel";
import { GuiServerConnector } from "./karabo_connectors/GuiServerConnector";
import AuthServerClient from "./http_clients/AuthServerClient";
import { BrowserRouter } from "react-router-dom";
import AppRouter from "./components/router/AppRouter";
import { appRoutes } from "./routes";
import { TooltipProvider } from "@/components/ui/tooltip";

const App: React.FC = () => {
  const executedOnceRef = React.useRef("");
  const { setWsProxyUrl, setAuthServerUrl } = useAppSettingsStore();
  const { setError, setLoggedIn, setLoggedOut } = useGlobalStore();

  useEffect(() => {
    const appSettings = initAppSettings();
    setWsProxyUrl(appSettings.wsProxyURL);
    setAuthServerUrl(appSettings.authServerURL);

    if (!executedOnceRef.current) {
      executedOnceRef.current = "true";

      GuiServerConnector.inst.onSessionDropped = (err_msg: string) => {
        setError(err_msg);
      };

      GuiServerConnector.inst.resumeGuiSession(
        new AuthServerClient(appSettings.authServerURL),
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
          });
        },
        () => setLoggedOut(),
        (errorMsg: string) => setError(errorMsg)
      );
    }
  }, [setWsProxyUrl, setAuthServerUrl, setError, setLoggedIn, setLoggedOut]);

  return (
    <TooltipProvider delayDuration={150} skipDelayDuration={300}>
      <BrowserRouter>
        <AppRouter
          routes={appRoutes}
          indexRedirect="no_scene"
          fallbackRedirect="no_scene"
        />
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default App;
