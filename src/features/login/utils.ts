import { decodeBinary } from '@/karabo-hash/bin_reader';
import { GuiServerInfo } from '@/karabo_data/GuiServerInfo';
import { guiServerInfoFromHash } from '@/karabo_hash/decoders/gui_session';
import { unpackEncodedHash } from '@/karabo_hash/hash_utils';
import { getNetwork } from '@/singletons/api';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { WebsocketBuilder } from 'websocket-ts';

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
