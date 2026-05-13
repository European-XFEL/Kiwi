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
import { Toaster } from '@/components/sonner';
import { AccessLevel } from '@/karabo/data/enums';
import { KaraboEvent, useKaraboEvent } from '@/lib/events';
import { Hash } from '@/karabo/data/hash';
import { toast } from 'sonner';

const App: React.FC = () => {
  const executedOnceRef = React.useRef('');
  const { setWsProxyUrl } = useAppSettingsStore();
  const {
    setError,
    setLoggedIn,
    setNotifiedSessionExpiration,
    setSessionExpired,
    setLoggedOut,
  } = useGlobalStore();

  useKaraboEvent(KaraboEvent.SessionDropped, (hash: Hash) => {
    setError(hash.getValue('message'));
  });

  useKaraboEvent(KaraboEvent.SessionExpired, (_: Hash) => {
    setSessionExpired();
  });

  useKaraboEvent(KaraboEvent.SessionExpirationNotified, (hash: Hash) => {
    setNotifiedSessionExpiration(hash.getValue('secondsToExpiration'));
  });

  useKaraboEvent(KaraboEvent.Notification, (hash: Hash) => {
    // Note: The notification being a one time event that is then "kept-alive"
    // for duration milliseconds (or until dismissal by a user) as a
    // top-most UI element by the toast component, doesn't need to change the
    // global state of the application.
    toast(
      <p style={{ fontSize: '1.25em' }}>
        <b>{hash.getValue('message')}</b>
        <br />
        &nbsp;
        <br />
      </p>,
      {
        position: 'top-center',
        duration: 20_000,
        description: `notification from GUI Server`,
        action: { label: 'Dismiss', onClick: () => {} },
      }
    );
  });

  useEffect(() => {
    const appSettings = initAppSettings();
    setWsProxyUrl(appSettings.wsProxyURL);
    console.log(`Kiwi.App: using burrow at ${appSettings.wsProxyURL}`);

    if (!executedOnceRef.current) {
      executedOnceRef.current = 'true';

      bootstrapStatefulIcons();

      // Initialize the Manager singleton;
      getManager();

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
      <>
        <BrowserRouter>
          <AppRouter
            routes={appRoutes}
            indexRedirect="no_scene"
            fallbackRedirect="no_scene"
          />
        </BrowserRouter>
        <Toaster
          position="top-center"
          closeButton
          richColors
          offset={{ top: '4.5rem' }}
          mobileOffset={{ top: '3.5rem' }}
        />
      </>
    </TooltipProvider>
  );
};

export default App;
