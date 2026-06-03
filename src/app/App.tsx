import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { bootstrapStatefulIcons } from '@/features/controllers/api';
import { initAppSettings } from './AppSettings';
import { useAppSettingsStore, useGlobalStore } from '@/store/api';
import { getNetwork, getManager, getConfig } from '@/lib/singletons/api';
import { TooltipProvider } from '@/components/api';
import { Toaster } from '@/components/api';
import { AccessLevel } from '@/karabo/data/enums';
import { KaraboEvent, useKaraboEvent } from '@/lib/events';
import { Hash } from '@/karabo/data/hash';
import { toast } from 'sonner';
import { sceneParamsFromURL } from '@/features/navigation/utils';

const App: React.FC = () => {
  const executedOnceRef = React.useRef('');
  const location = useLocation();
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
    if (appSettings.wsProxyURL.length > 0) {
      console.log(
        `Kiwi.App: using websocket proxy at ${appSettings.wsProxyURL}`
      );
    } else {
      console.log(
        'Kiwi.App: using direct connection to GUI Server websocket port'
      );
    }

    if (!executedOnceRef.current) {
      executedOnceRef.current = 'true';

      bootstrapStatefulIcons();

      // Initialize the Manager singleton;
      getManager();

      // If the application is being initialized from scene URL (e.g. a bookmark), try
      // to resume any existing GUI Session for the host:port specified in the scene URL.
      // Otherwise try to resume an existing GUI Session with the last connected host:port.
      const sceneParams = sceneParamsFromURL(location.search);
      let host: string | null;
      let port: number | null;
      if (sceneParams) {
        host = sceneParams.host;
        port = sceneParams.port;
      } else {
        host = getConfig().lastHost;
        port = getConfig().lastPort;
      }
      getNetwork().resumeGuiSession(
        host,
        port,
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
