import { useEffect, useState } from 'react';
import { useGlobalActivityStore, useGlobalStore } from '@/store/api';
import type { WorkspaceFooterRuntime } from '../types';

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

function getConnectedForInterval(sessionStartEpoc: number): number {
  const elapsedSecs = Math.floor((Date.now() - sessionStartEpoc) / 1000);

  if (elapsedSecs > 3599) {
    return 60 * 1000;
  }

  if (elapsedSecs > 59) {
    return 3000;
  }

  return 1000;
}

export default function useWorkspaceFooterRuntime(): Pick<
  WorkspaceFooterRuntime,
  'connectedFor' | 'latestLatency' | 'queuedMessageCount'
> {
  const sessionStartEpoc = useGlobalStore(
    (state) => state.sessionInfo?.sessionStartEpoc
  );
  const queuedMessageCount = useGlobalActivityStore(
    (state) => state.queuedMessageCount
  );
  const latestLatency = useGlobalActivityStore((state) => state.latestLatency);
  const [connectedFor, setConnectedFor] = useState<string | undefined>(() =>
    getConnectedForLabel(sessionStartEpoc)
  );

  useEffect(() => {
    const updateConnectedFor = () => {
      setConnectedFor(getConnectedForLabel(sessionStartEpoc));
    };

    updateConnectedFor();

    if (sessionStartEpoc === undefined) return;

    const timer = window.setInterval(
      updateConnectedFor,
      getConnectedForInterval(sessionStartEpoc)
    );

    return () => window.clearInterval(timer);
  }, [sessionStartEpoc]);

  return { connectedFor, latestLatency, queuedMessageCount };
}
