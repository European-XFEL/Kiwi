import React from "react";
import { GlobalState, useGlobalStore } from "../store/globalAppStateStore";
import InitializingState from "./states/InitializingState";
import LoggedInState from "./states/LoggedInState";
import LoggedOutState from "./states/LoggedOutState";
import ErrorState from "./states/ErrorState";

const AppBody: React.FC = () => {
  const globalState = useGlobalStore((s) => s.globalState);
  const lastError = useGlobalStore((s) => s.lastError);

  const stateComponents: Record<GlobalState, React.ReactNode> = {
    INIT: <InitializingState />,
    LOGGED_OUT: <LoggedOutState />,
    UNRECOVERABLE_ERROR: <ErrorState error={lastError} />,
    LOGGED_IN: <LoggedInState />,
    SCENE_OPEN_ERROR: <ErrorState error={lastError} />,
    SCENE_DISPLAY_ERROR: undefined,
  };

  return <>{stateComponents[globalState] || <div />}</>;
};

export default AppBody;
