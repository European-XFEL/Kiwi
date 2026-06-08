import React, { useMemo } from 'react';
import { GlobalState, useGlobalStore } from '@/store/api';
import InitializingState from './states/InitializingState';
import LoggedInState from './states/LoggedInState';
import LoggedOutState from './states/LoggedOutState';
import ErrorState from './states/ErrorState';
import SessionExpiredState from './states/SessionExpiredState';

const AppBody: React.FC = () => {
  const globalState = useGlobalStore((s) => s.globalState);
  const lastError = useGlobalStore((s) => s.lastGlobalError);

  const isInitializing = globalState === 'INIT';

  const stateComponents = useMemo<Record<GlobalState, React.ReactNode>>(
    () => ({
      INIT: null, // handled by overlay
      LOGGED_OUT: <LoggedOutState />,
      UNRECOVERABLE_ERROR: <ErrorState error={lastError} />,
      LOGGED_IN: <LoggedInState />,
      // Notification for session expiration doesn't change the UI state heavily - just
      // presents a temporary notification to the user
      NOTIFIED_SESSION_EXPIRATION: <LoggedInState />,
      SESSION_EXPIRED: <SessionExpiredState />,
      SCENE_OPEN_ERROR: <ErrorState error={lastError} />,
      SCENE_DISPLAY_ERROR: <LoggedInState />,
    }),
    [lastError]
  );

  return (
    <>
      {stateComponents[globalState] ?? null}

      {/* Always mounted overlay to prevent "last-frame jump" */}
      <InitializingState visible={isInitializing} />
    </>
  );
};

export default AppBody;
