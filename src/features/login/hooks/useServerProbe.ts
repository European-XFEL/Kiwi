import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { ActivityStatus, GuiServerInfo } from '../auth.types';
import { probeServer } from '@/features/login/utils';
import { getConfig } from '@/lib/singletons/api';
import { sceneParamsFromURL } from '@/features/navigation/utils';

const DEBOUNCE_MS = 2000;

interface UseServerProbeProps {
  initialHost?: string;
  initialPort?: string;
}

interface UseServerProbeReturn {
  host: string;
  port: string;
  probedServerInfo: GuiServerInfo | null;
  activityStatus: ActivityStatus;
  errorMsg: string;
  setHost: (host: string) => void;
  setPort: (port: string) => void;
  doProbeServer: (host: string, port: number) => void;
  setActivityStatus: (status: ActivityStatus) => void;
  setErrorMessage: (msg: string) => void;
}

/**
 * Hook to manage server probing (checking if GUI server is available)
 */
export function useServerProbe({
  initialHost = '',
  initialPort = '',
}: UseServerProbeProps = {}): UseServerProbeReturn {
  const [host, setHost] = useState<string>(initialHost);
  const [port, setPort] = useState<string>(initialPort);
  const [probedServerInfo, setProbedServerInfo] =
    useState<GuiServerInfo | null>(null);
  const [activityStatus, setActivityStatus] = useState<ActivityStatus>(
    ActivityStatus.NO_ACTIVITY
  );
  const [errorMsg, setErrorMessage] = useState('');

  const location = useLocation();

  // #region Focused control capture and restoration

  const savedFocusIdRef = useRef<string>(null);

  const captureFocusedControl = () => {
    if (document.activeElement && document.activeElement.id) {
      savedFocusIdRef.current = document.activeElement.id;
    }
  };

  useLayoutEffect(() => {
    restoreFocusedControl();
    // Clear the focused control ref for the next capture/restore cycle
    savedFocusIdRef.current = null;
  }, [probedServerInfo]);

  const restoreFocusedControl = () => {
    if (savedFocusIdRef.current) {
      const elementToFocus = document.getElementById(savedFocusIdRef.current);
      if (elementToFocus && document.activeElement !== elementToFocus) {
        elementToFocus.focus();
      }
    }
  };

  // #endregion

  const didInitialProbeRef = useRef(false);

  // Probe success callback
  const onProbeSuccess = useCallback((serverInfo: GuiServerInfo) => {
    captureFocusedControl();
    setProbedServerInfo(serverInfo);
    setErrorMessage('');
    setActivityStatus(ActivityStatus.NO_ACTIVITY);
  }, []);

  // Probe failure callback
  const onProbeFailure = useCallback((errMsg: string) => {
    captureFocusedControl();
    setErrorMessage(errMsg);
    setActivityStatus(ActivityStatus.NO_ACTIVITY);
    setProbedServerInfo(null);
  }, []);

  // Probe server
  const doProbeServer = useCallback(
    (h: string, pNum: number) => {
      if (!h || !Number.isFinite(pNum) || pNum <= 0 || pNum > 65535) return;
      captureFocusedControl();
      setActivityStatus(ActivityStatus.PROBING_SERVER);
      probeServer(h, pNum).then(onProbeSuccess).catch(onProbeFailure);
    },
    [onProbeSuccess, onProbeFailure]
  );

  // Initial probe (runs once)
  useEffect(() => {
    if (!didInitialProbeRef.current) {
      // If the current URL is of a scene, use the host and port in the URL for
      // the initial server probing; otherwise use the last successfully connected
      // GUI Server, if any.
      const sceneParams = sceneParamsFromURL(location.search);
      let savedHost: string | null;
      let savedPort: string | null;
      if (sceneParams) {
        savedHost = sceneParams.host;
        savedPort = `${sceneParams.port}`;
      } else {
        const lastHost = getConfig().lastHost;
        savedHost = lastHost ?? initialHost;
        const lastPort = getConfig().lastPort;
        savedPort = lastPort === 0 ? initialPort : `${lastPort}`;
      }

      setHost(savedHost);
      setPort(savedPort);

      const pNum = parseInt(savedPort, 10);
      didInitialProbeRef.current = true;
      doProbeServer(savedHost, Number.isNaN(pNum) ? 0 : pNum);
    }
  }, [initialHost, initialPort, doProbeServer]);

  // Debounced probe on host/port change
  useEffect(() => {
    const pNum = parseInt(port, 10);
    if (!host || Number.isNaN(pNum)) return;

    const id = window.setTimeout(() => {
      doProbeServer(host.trim(), pNum);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(id);
  }, [host, port, doProbeServer]);

  return {
    host,
    port,
    probedServerInfo,
    activityStatus,
    errorMsg,
    setHost,
    setPort,
    doProbeServer,
    setActivityStatus,
    setErrorMessage,
  };
}
