import { packEncodedHash } from '@/karabo_hash/hash_utils';
import { HashDeque } from '@/karabo_hash/HashDeque';
import { Websocket, WebsocketBuilder } from 'websocket-ts';

// #region Messages between Worker and main thread
export enum WorkerMessageType {
  // Messages from main thread to the Worker
  startGuiServerSession = 'startGuiServerSession',
  getNextGuiServerMessage = 'getNextGuiServerMessage',
  sendHash = 'sendHash',
  // Messages from the Worker to the main thread
  nextGuiServerMessage = 'nextGuiServerMessage',
  guiServerMessageStats = 'guiServerMessageStats',
  error = 'error',
}

export interface WorkerMessage {
  type: WorkerMessageType;
}

export interface StartGuiServerSessionMessage extends WorkerMessage {
  wsProxyURL: string;
  guiServerHost: string;
  guiServerPort: number;
}

export interface BinHashMessage extends WorkerMessage {
  binHash: ArrayBuffer;
}

export interface GuiServerMessageStats extends WorkerMessage {
  queuedItemsCount: number;
  latestLatency: number;
}

export interface SessionErrorMessage extends WorkerMessage {
  message: string;
}

// #endregion

const _hashDeque = new HashDeque();
let _guiServerHost: string | undefined = undefined;
let _guiServerPort: number | undefined = undefined;

// #region Worker message handlers

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const message = e.data;
  switch (message.type) {
    case WorkerMessageType.startGuiServerSession: {
      const startSessionMsg = e.data as StartGuiServerSessionMessage;
      _onStartGuiServerSession(
        startSessionMsg.wsProxyURL,
        startSessionMsg.guiServerHost,
        startSessionMsg.guiServerPort
      );
      break;
    }
    case WorkerMessageType.getNextGuiServerMessage:
      _onGetNextGuiServerMessage();
      break;
    case WorkerMessageType.sendHash: {
      const binHashMsg = message as BinHashMessage;
      _ws?.send(packEncodedHash(binHashMsg.binHash));
      break;
    }

    default:
      console.error(
        `Unrecognized message type received from main thread: ${message.type}`
      );
  }
};

const _onStartGuiServerSession = (
  wsProxyURL: string,
  guiServerHost: string,
  guiServerPort: number
) => {
  _guiServerHost = guiServerHost;
  _guiServerPort = guiServerPort;
  _ws = new WebsocketBuilder(wsProxyURL)
    .onOpen(_onWsOpen)
    .onMessage(_onWsMessage)
    .onError(_onWsError)
    .build();
};

const _onGetNextGuiServerMessage = () => {
  const binHash = _hashDeque.popHash();

  if (binHash) {
    postMessage({
      type: WorkerMessageType.nextGuiServerMessage,
      binHash: binHash,
    });
    postMessage({
      type: WorkerMessageType.guiServerMessageStats,
      queuedItemsCount: _hashDeque.itemsCount,
      latestLatency: _hashDeque.latestLatency,
    });
  }
};

// #endregion

// #region Websocket and its event handlers

let _ws: Websocket | undefined = undefined;

const _onWsOpen = (ws: Websocket, _ev: Event): any => {
  // A GUI Server session always starts with a message instructing the
  // WebSocketProxy to connect to a GUI Server.
  ws.send(JSON.stringify({ host: _guiServerHost, port: _guiServerPort }));
};

const _onWsMessage = (ws: Websocket, ev: MessageEvent<any>): any => {
  if (typeof ev.data === 'string') {
    // The only occasions when the WebSocketProxy does not send a
    // binary serialized Hash are when it communicates an error for
    // connecting to the GUI Server or when it loses the connection to
    // the GUI Server. On those occasions, the message is a string in
    // the format "0|<error message>".
    const err_msg = (
      ev.data.startsWith('0|') ? ev.data.substring(2) : ev.data
    ).trim();
    postMessage({ type: WorkerMessageType.error, message: err_msg });
    ws.close();
    close(); // Terminate the worker from within
  } else {
    const msgBlob = ev.data as Blob;
    msgBlob.arrayBuffer().then((binHash: ArrayBuffer) => {
      _hashDeque.pushHash(binHash);
      postMessage({
        type: WorkerMessageType.guiServerMessageStats,
        queuedItemsCount: _hashDeque.itemsCount,
        latestLatency: _hashDeque.latestLatency,
      });
    });
  }
};

const _onWsError = (ws: Websocket, ev: Event): any => {
  let message: string | undefined;
  if (!ws.underlyingWebsocket) {
    // Websocket connection failed to be established
    message = 'Websocket client initialization error';
  } else {
    if (ws.underlyingWebsocket?.CLOSED) {
      // Connection could not be established or couldn't be opened.
      message = 'No connection to websocket server';
    } else if (ws.underlyingWebsocket?.CLOSING) {
      message = 'Websocket connection being closed.';
    } else {
      message = ev.toString();
      ws.close();
    }
  }
  postMessage({ type: WorkerMessageType.error, message: message });
  close(); // Terminate the worker from within
};

// #endregion
