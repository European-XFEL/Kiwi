import { decodeBinary } from '@/karabo-hash/bin_reader';
import { GuiServerInfo } from '@/karabo_data/GuiServerInfo';
import { guiServerInfoFromHash } from '@/karabo_hash/decoders/gui_session';
import { unpackEncodedHash } from '@/karabo_hash/hash_utils';
import { getNetwork } from '@/singletons/api';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { WebsocketBuilder } from 'websocket-ts';
import { ActivityStatus } from '../types/auth.types';

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

// #region Server Probing

function probeServer(
  host: string,
  port: number,
  onSuccess: (serverInfo: GuiServerInfo) => void,
  onError: (errMsg: string) => void
): void {
  new WebsocketBuilder(useAppSettingsStore.getState().wsProxyURL)
    .onOpen((ws) => {
      ws.send(JSON.stringify({ host: host, port: port }));
    })
    .onMessage((ws, ev) => {
      if (typeof ev.data === 'string') {
        onError(`No GUI server available at "${host}:${port}"`);
        ws.close();
      } else {
        const msgBlob = ev.data as Blob;
        msgBlob.arrayBuffer().then((binHash: ArrayBuffer) => {
          const hash = decodeBinary(unpackEncodedHash(binHash));
          const guiServerInfo = guiServerInfoFromHash(hash);
          onSuccess(guiServerInfo);
          ws.close();
        });
      }
    })
    .onError((ws, ev) => {
      let message = getNetwork().websocketEventMessage(ws, ev);
      onError(message);
      ws.close();
    })
    .build();
}

// #endregion

/**
 * Hook to manage server probing (checking if GUI server is available)
 */
export function useServerProbe({
  initialHost = 'localhost',
  initialPort = '44444',
}: UseServerProbeProps = {}): UseServerProbeReturn {
  const [host, setHost] = useState<string>(initialHost);
  const [port, setPort] = useState<string>(initialPort);
  const [probedServerInfo, setProbedServerInfo] =
    useState<GuiServerInfo | null>(null);
  const [activityStatus, setActivityStatus] = useState<ActivityStatus>(
    ActivityStatus.NO_ACTIVITY
  );
  const [errorMsg, setErrorMessage] = useState('');

  const didInitialProbeRef = useRef(false);

  // Probe success callback
  const onProbeSuccess = useCallback((serverInfo: GuiServerInfo) => {
    setProbedServerInfo(serverInfo);
    setErrorMessage('');
    setActivityStatus(ActivityStatus.NO_ACTIVITY);
  }, []);

  // Probe failure callback
  const onProbeFailure = useCallback((errMsg: string) => {
    setErrorMessage(errMsg);
    setActivityStatus(ActivityStatus.NO_ACTIVITY);
    setProbedServerInfo(null);
  }, []);

  // Probe server
  const doProbeServer = useCallback(
    (h: string, pNum: number) => {
      if (!h || !Number.isFinite(pNum) || pNum <= 0 || pNum > 65535) return;
      setActivityStatus(ActivityStatus.PROBING_SERVER);
      probeServer(h, pNum, onProbeSuccess, onProbeFailure);
    },
    [onProbeSuccess, onProbeFailure]
  );

  // Initial probe (runs once)
  useEffect(() => {
    if (!didInitialProbeRef.current) {
      const savedHost = localStorage.getItem('lastHost') || initialHost;
      const savedPort = localStorage.getItem('lastPort') || initialPort;
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
