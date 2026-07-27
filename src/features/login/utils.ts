import { Hash, decodeBinary } from '@/karabo/data/api';
import { useAppSettingsStore } from '@/store/api';
import { WebsocketBuilder } from 'websocket-ts';
import { GuiServerInfo, TopicServerMap } from './auth.types';

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

export async function probeServer(
  host: string,
  port: number
): Promise<GuiServerInfo> {
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

  const _unavailableGuiServerMsg = `No GUI server available at "${host}:${port}"`;

  return new Promise<GuiServerInfo>((resolve, reject) => {
    let isSettled = false;
    const resolveProbe = (serverInfo: GuiServerInfo) => {
      if (isSettled) return;
      isSettled = true;
      resolve(serverInfo);
    };
    const rejectProbe = (errMsg: string) => {
      if (isSettled) return;
      isSettled = true;
      reject(errMsg);
    };

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
          rejectProbe(_unavailableGuiServerMsg);
          ws.close();
          return;
        }

        const msgBlob = ev.data as Blob;
        msgBlob
          .arrayBuffer()
          .then((binHash: ArrayBuffer) => {
            const hash = decodeBinary(
              new Uint8Array(binHash, 4, binHash.byteLength - 4)
            );
            const guiServerInfo = extractGuiServerInfo(hash);
            if (!guiServerInfo) {
              return;
            }

            // A banner may arrive before the actual server information, so only
            // resolve once the expected payload is decoded.
            resolveProbe(guiServerInfo);
            ws.close();
          })
          .catch((error: unknown) => {
            rejectProbe(String(error));
            ws.close();
          });
      })
      .onClose(() => {
        rejectProbe(_unavailableGuiServerMsg);
      })
      .onError((ws) => {
        rejectProbe(_unavailableGuiServerMsg);
        ws.close();
      })
      .build();
  });
}

/**
 * Decodes a string containing "topic" to GUI Server "hostname:port" mappings
 * in the format detailed below. Such strings are used to defined values for
 * environment variables containing the mappings.
 *
 * Expected format:
 * `TOPIC:HOSTNAME:PORT;TOPIC:HOSTNAME:PORT`
 *
 * Example from `.env.production`:
 * `SA1:sa1-br-sys-con-gui3:8090;SA2:sa2-br-sys-con-gui3:8090;SA3:localhost:44448`
 *
 * Returns `undefined` for missing or empty input. Valid `topic:host:port`
 * entries are decoded into an object keyed by topic. Entries that do not split
 * into exactly three parts are ignored. Ports are parsed as integers.
 */
export function decodeTopicServerMap(
  encodedMappings?: string
): TopicServerMap | undefined {
  if (!encodedMappings) {
    return undefined;
  }
  let topicServerMap: TopicServerMap = {};
  const entries = encodedMappings.split(';');
  entries.forEach((encodedMapEntry: string, _index: number) => {
    const parts = encodedMapEntry.split(':');
    if (parts.length === 3) {
      topicServerMap[parts[0]] = {
        hostname: parts[1],
        hostport: Number.parseInt(parts[2]),
      };
    }
  });
  return topicServerMap;
}
