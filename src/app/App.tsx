import React, { useEffect } from 'react';
import { bootstrapStatefulIcons } from '@/features/controllers/api';
import { initAppSettings } from './AppSettings';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { getNetwork, getManager } from '@/lib/singletons/api';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './router/AppRouter';
import { appRoutes } from './routes';
import { TooltipProvider } from '@/components/tooltip';
import { AccessLevel } from '@/karabo/data/enums';

const App: React.FC = () => {
  const executedOnceRef = React.useRef('');
  const { setWsProxyUrl } = useAppSettingsStore();
  const { setError, setLoggedIn, setLoggedOut } = useGlobalStore();

  useEffect(() => {
    const appSettings = initAppSettings();
    setWsProxyUrl(appSettings.wsProxyURL);

    if (!executedOnceRef.current) {
      executedOnceRef.current = 'true';

      bootstrapStatefulIcons();

      // Initialize the Manager singleton;
      getManager();
      // TODO: No attachment of handlers ... use mediator
      getNetwork().onSessionDropped = (err_msg: string) => {
        setError(err_msg);
      };

      getNetwork().resumeGuiSession(
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
  }, [setWsProxyUrl, setError, setLoggedIn, setLoggedOut]);

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
