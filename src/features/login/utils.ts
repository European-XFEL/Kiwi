import { Hash, decodeBinary } from '@/karabo/data/api';
import { getNetwork } from '@/lib/singletons/api';
import { useAppSettingsStore } from '@/store/api';
import { WebsocketBuilder } from 'websocket-ts';
import { GuiServerInfo } from './auth.types';

export function extractGuiServerInfo(hash: Hash):
  | {
      deviceId: string;
      hostname: string;
      hostport: number;
      authRequired: boolean;
      authServer: string;
      readOnly: boolean;
      topic: string;
      version: string;
    }
  | undefined {
  if (hash.getValue('type') !== 'serverInformation') {
    console.warn(
      `extractGuiServerInfo called for hash of type "${hash.getValue('type')}": decoding won't proceed`
    );
    return undefined;
  }
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
  const wsProxyURL = useAppSettingsStore.getState().wsProxyURL;

  // Initialize the two possible connection modes: direct connection to a GUI
  // server web socket port (empty wsProxyURL) or proxy-intermediated connection
  // to an older GUI server with only a tcp port
  const useWebSocketProxy: boolean =
    wsProxyURL !== undefined && wsProxyURL.length > 0;
  const websocketURL = useWebSocketProxy ? wsProxyURL : `ws://${host}:${port}`;

  if (!useWebSocketProxy) {
    console.log(`Probing server directly at URL '${websocketURL}'`);
  }

  new WebsocketBuilder(websocketURL)
    .onOpen((ws) => {
      if (useWebSocketProxy) {
        // When the connection to the GUI server is intermediated by a web socket proxy,
        // the target GUI Server host and port must be sent for the proxy to initialize
        // the connection
        ws.send(JSON.stringify({ host: host, port: port }));
      }
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
          if (guiServerInfo) {
            // The message received via the websocket was not of the GuiServerInfo
            // That is possible, for example, if the GUI Server has a banner configured.
            // The banner is sent right away, not only after the login.
            onSuccess(guiServerInfo);
          }
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
