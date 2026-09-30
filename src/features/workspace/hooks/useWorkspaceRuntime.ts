import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRootProject } from '@/features/project/api';
import { useAccessLevel } from '@/features/user';
import { getNetwork, getPanelWrangler } from '@/lib/singletons/api';
import { useGlobalActivityStore, useGlobalStore } from '@/store/api';
import { broadcast_event, KaraboEvent } from '@/lib/events';
import type { WorkspaceRuntime } from '../types';

function getConnectedForLabel(sessionStartEpoc?: number): string | undefined {
  if (sessionStartEpoc === undefined) {
    return undefined;
  }

  const elapsedSecs = Math.floor((Date.now() - sessionStartEpoc) / 1000);

  if (elapsedSecs > 3599) {
    const hours = Math.floor(elapsedSecs / 3600);
    const mins = Math.floor((elapsedSecs % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;
  }

  if (elapsedSecs > 59) {
    const mins = Math.floor(elapsedSecs / 60);
    const secs = elapsedSecs % 60;
    return `${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  }

  return `${elapsedSecs.toString().padStart(2, '0')}s`;
}

function getConnectedForInterval(sessionStartEpoc?: number): number {
  if (sessionStartEpoc === undefined) {
    return 1000;
  }

  const elapsedSecs = Math.floor((Date.now() - sessionStartEpoc) / 1000);

  if (elapsedSecs > 3599) {
    return 60 * 1000;
  }

  if (elapsedSecs > 59) {
    return 3000;
  }

  return 1000;
}

export default function useWorkspaceRuntime(): WorkspaceRuntime {
  const navigate = useNavigate();
  const sessionInfo = useGlobalStore((state) => state.sessionInfo);
  const globalState = useGlobalStore((state) => state.globalState);
  const setLoggedOut = useGlobalStore((state) => state.setLoggedOut);
  const wrangler = getPanelWrangler();
  const sceneTabOpen = useSyncExternalStore(
    wrangler.subscribe,
    wrangler.isSceneTabOpen
  );
  const projectLoading = useSyncExternalStore(
    wrangler.subscribe,
    () => wrangler.getSnapshot().projectLoading
  );
  const queuedMessageCount = useGlobalActivityStore(
    (state) => state.queuedMessageCount
  );
  const latestLatency = useGlobalActivityStore((state) => state.latestLatency);
  const lastActivity = useGlobalActivityStore((state) => state.lastActivity);
  const activityLevel = useGlobalActivityStore((state) => state.activityLevel);
  const { accessLevel, canChangeLevel, canChangeTo, changeLevel } =
    useAccessLevel();
  const browser = useRootProject();
  const [connectedFor, setConnectedFor] = useState<string | undefined>(() =>
    getConnectedForLabel(sessionInfo?.sessionStartEpoc)
  );

  useEffect(() => {
    const updateConnectedFor = () => {
      setConnectedFor(getConnectedForLabel(sessionInfo?.sessionStartEpoc));
    };

    updateConnectedFor();

    const timer = window.setInterval(
      updateConnectedFor,
      getConnectedForInterval(sessionInfo?.sessionStartEpoc)
    );

    return () => window.clearInterval(timer);
  }, [sessionInfo?.sessionStartEpoc]);

  const onGoToHomeTab = useCallback(() => {
    broadcast_event(KaraboEvent.GoToHomeTab, {});
  }, []);

  const onLogout = useCallback(() => {
    getNetwork().finishSession();
    setLoggedOut();
    navigate('/', { replace: true });
  }, [navigate, setLoggedOut]);

  let guiServerDesc: string | undefined = undefined;
  if (sessionInfo?.guiServerHost && sessionInfo?.guiServerPort) {
    guiServerDesc = `${sessionInfo.guiServerHost}:${sessionInfo.guiServerPort}`;
    if (sessionInfo?.isReadOnly) {
      guiServerDesc = `${guiServerDesc} (read-only)`;
    }
  }

  return {
    access: sessionInfo
      ? { accessLevel, canChangeLevel, canChangeTo, onChange: changeLevel }
      : undefined,
    sceneTabOpen,
    activity: { lastActivity, activityLevel },
    browser,
    connected:
      globalState === 'LOGGED_IN' ||
      globalState === 'NOTIFIED_SESSION_EXPIRATION',
    connectedFor,
    guiServer: guiServerDesc,
    guiServerVersion: sessionInfo?.guiServerVersion,
    latestLatency,
    onGoToHomeTab,
    projectLoading,
    queuedMessageCount,
    topic: sessionInfo?.guiServerTopic,
    user: sessionInfo
      ? {
          loggedUser: sessionInfo.loggedUser,
          topic: sessionInfo.guiServerTopic,
          onLogout,
        }
      : undefined,
  };
}
