import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { ActivityStatus } from '../auth.types';
import { useLoginContext } from '../LoginContext';
import { probeServer } from '../utils';

/** Performs probes requested by a server form and publishes results to login. */
export function useServerProbe() {
  const { probeResult, activityStatus, setProbeResult, setActivityStatus } =
    useLoginContext();
  const probeIdRef = useRef(0);
  const savedFocusIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      probeIdRef.current += 1;
    };
  }, []);

  useLayoutEffect(() => {
    if (activityStatus !== ActivityStatus.NO_ACTIVITY) return;
    if (savedFocusIdRef.current) {
      document.getElementById(savedFocusIdRef.current)?.focus();
      savedFocusIdRef.current = null;
    }
  }, [activityStatus, probeResult]);

  const resetProbe = useCallback(() => {
    probeIdRef.current += 1;
    setProbeResult({ status: 'idle' });
    setActivityStatus(ActivityStatus.NO_ACTIVITY);
  }, [setProbeResult, setActivityStatus]);

  const doProbeServer = useCallback(
    (host: string, port: number) => {
      resetProbe();
      if (!host || !Number.isInteger(port) || port <= 0 || port > 65535) {
        return;
      }

      const probeId = probeIdRef.current;
      savedFocusIdRef.current = document.activeElement?.id || null;
      setActivityStatus(ActivityStatus.PROBING_SERVER);
      probeServer(host, port)
        .then((serverInfo) => {
          if (probeId !== probeIdRef.current) return;
          setProbeResult({ status: 'success', serverInfo });
          setActivityStatus(ActivityStatus.NO_ACTIVITY);
        })
        .catch((error: unknown) => {
          if (probeId !== probeIdRef.current) return;
          setProbeResult({ status: 'failure', error });
          setActivityStatus(ActivityStatus.NO_ACTIVITY);
        });
    },
    [resetProbe, setProbeResult, setActivityStatus]
  );

  return { doProbeServer, resetProbe };
}
