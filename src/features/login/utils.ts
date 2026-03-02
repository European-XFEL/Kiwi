import { decodeBinary } from '@/karabo/data/bin_reader';
import { Hash } from '@/karabo/data/hash';
import { getNetwork } from '@/lib/singletons/api';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { WebsocketBuilder } from 'websocket-ts';
import { GuiServerInfo } from './auth.types';

export function extractGuiServerInfo(hash: Hash) {
  const authServer = hash.getValue('authServer') as string;

  return {
    deviceId: hash.getValue('deviceId') as string,
    hostname: hash.getValue('hostname') as string,
    hostport: Number.parseInt(hash.getValue('hostport') as string, 10),
    authRequired: !!authServer,
    authServer,
    readOnly: hash.getValue('readOnly') as boolean,
    topic: hash.getValue('topic') as string,
    version: hash.getValue('version') as string,
  };
}

export function probeServer(
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
          const hash = decodeBinary(
            new Uint8Array(binHash, 4, binHash.byteLength - 4)
          );
          const guiServerInfo = extractGuiServerInfo(hash);
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
