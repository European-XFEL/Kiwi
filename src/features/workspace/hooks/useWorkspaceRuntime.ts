import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessLevelDisplay } from '@/components/api';
import { useActiveSceneStore } from '@/features/scene-view/api';
import { useGlobalActivityStore, useGlobalStore } from '@/store/api';
import { getPanelWrangler } from '@/lib/singletons/api';
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
  const loadedSceneRef = useActiveSceneStore((state) => state.loadedSceneRef);
  const queuedMessageCount = useGlobalActivityStore(
    (state) => state.queuedMessageCount
  );
  const latestLatency = useGlobalActivityStore((state) => state.latestLatency);
  const [connectedFor, setConnectedFor] = useState<string | undefined>(() =>
    getConnectedForLabel(sessionInfo?.sessionStartEpoc)
  );
  const accessLevelInfo = getAccessLevelDisplay(sessionInfo?.accessLevel);

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

  const activeScene = loadedSceneRef;

  const onGoHome = useCallback(() => {
    getPanelWrangler().resetCenter();
    navigate('/main');
  }, [navigate]);

  return {
    accessLevelLabel: accessLevelInfo?.label,
    activeScene,
    connected:
      globalState === 'LOGGED_IN' ||
      globalState === 'NOTIFIED_SESSION_EXPIRATION',
    connectedFor,
    guiServer:
      sessionInfo?.guiServerHost && sessionInfo?.guiServerPort
        ? `${sessionInfo.guiServerHost}:${sessionInfo.guiServerPort}`
        : undefined,
    guiServerVersion: sessionInfo?.guiServerVersion,
    latestLatency,
    onGoHome,
    queuedMessageCount,
    topic: sessionInfo?.guiServerTopic,
  };
}
