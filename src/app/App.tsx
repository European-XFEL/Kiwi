import React, { useEffect } from 'react';
import { bootstrapStatefulIcons } from '@/features/controllers/api';
import { initAppSettings } from './AppSettings';
import {
  useAppSettingsStore,
  useGlobalStore,
  useApplicationModeStore,
} from '@/store/api';
import {
  getNetwork,
  getManager,
  getConfig,
  getPanelWrangler,
} from '@/lib/singletons/api';
import { TooltipProvider } from '@/components/api';
import { Toaster } from '@/components/api';
import { KaraboEvent, useKaraboEvent } from '@/lib/events';
import { Hash } from '@/karabo/data/hash';
import { toast } from 'sonner';
import useSessionCleanup from './hooks/useSessionCleanup';
import {
  cinemaServer,
  CINEMA_BOOKMARK_INSTRUCTION,
} from '@/features/cinema/api';

const App: React.FC = () => {
  const { mode, launch, launchError } = useApplicationModeStore();
  const executedOnceRef = React.useRef('');
  const { setWsProxyUrl, setTopicGuiServerMapping } = useAppSettingsStore();
  const {
    setError,
    setCinemaError,
    setLoggedIn,
    setNotifiedSessionExpiration,
    setSessionExpired,
    setLoggedOut,
  } = useGlobalStore();

  useSessionCleanup();

  useKaraboEvent(KaraboEvent.SessionDropped, (hash: Hash) => {
    setError(hash.getValue('message'));
  });

  useKaraboEvent(KaraboEvent.SessionExpired, () => {
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
    setTopicGuiServerMapping(appSettings.topicGuiServerMapping);

    if (!executedOnceRef.current) {
      executedOnceRef.current = 'true';

      getPanelWrangler().setMode(mode);
      if (mode === 'cinema' && (launchError || !launch)) {
        setCinemaError(launchError ?? CINEMA_BOOKMARK_INSTRUCTION);
        return;
      }

      bootstrapStatefulIcons();

      // Initialize the Manager singleton;
      getManager();

      const { host, port, canResume } = cinemaServer(
        mode === 'cinema' ? launch : undefined,
        getConfig()
      );
      if (!canResume) {
        setLoggedOut();
        return;
      }
      getNetwork()
        .resumeGuiSession(host, port)
        .then((sessionData) => {
          if (!sessionData) {
            // There was no session to be resumed
            setLoggedOut();
            return;
          }
          // Session was resumed successfully
          const {
            accessLevel,
            host,
            port,
            userId,
            isReadOnly,
            topic,
            serverVersion,
          } = sessionData;

          setLoggedIn({
            accessLevel,
            loggedUser: userId,
            isReadOnly,
            guiServerHost: host,
            guiServerPort: port,
            guiServerTopic: topic,
            guiServerVersion: serverVersion,
            sessionStartEpoc: Date.now(),
          });
        })
        .catch((error: unknown) => {
          // An error happened during the attempt to resume a session
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          setError(errorMsg);
        });
    }
  }, [
    setWsProxyUrl,
    setTopicGuiServerMapping,
    setError,
    setCinemaError,
    setLoggedIn,
    setLoggedOut,
    mode,
    launch,
    launchError,
  ]);

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
