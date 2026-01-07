import { packEncodedHash } from '@/karabo_hash/hash_utils';
import { HashDeque } from '@/karabo_hash/HashDeque';
import { Websocket, WebsocketBuilder } from 'websocket-ts';

// #region Messages Definitions
export enum WorkerMessageType {
  startGuiServerSession = 'startGuiServerSession',
  getNextGuiServerMessage = 'getNextGuiServerMessage',
  sendHash = 'sendHash',
  guiServerMessageReceived = 'guiServerMessageReceived',
  nextGuiServerMessage = 'nextGuiServerMessage',
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

export interface SendHashMessage extends WorkerMessage {
  binHash: ArrayBuffer;
}

export interface NextGuiServerMessage extends WorkerMessage {
  binHash: ArrayBuffer;
  queuedItemsCount: number;
  latestLatency: number;
}

export interface SessionErrorMessage extends WorkerMessage {
  message: string;
}
// #endregion

class GuiServerSession {
  private _hashDeque = new HashDeque();
  private _ws: Websocket | undefined;
  private _guiServerHost: string | undefined;
  private _guiServerPort: number | undefined;

  constructor() {
    // Bind methods to 'this' to ensure they work when passed as callbacks
    this.handleMessage = this.handleMessage.bind(this);
    this._onWsOpen = this._onWsOpen.bind(this);
    this._onWsMessage = this._onWsMessage.bind(this);
    this._onWsError = this._onWsError.bind(this);
  }

  /**
   * Main entry point: Handles messages coming from the Main Thread
   */
  public handleMessage(e: MessageEvent<WorkerMessage>) {
    const message = e.data;
    switch (message.type) {
      case WorkerMessageType.startGuiServerSession:
        const startSessionMsg = message as StartGuiServerSessionMessage;
        this._startSession(
          startSessionMsg.wsProxyURL,
          startSessionMsg.guiServerHost,
          startSessionMsg.guiServerPort
        );
        break;

      case WorkerMessageType.getNextGuiServerMessage:
        this._sendNextMessage();
        break;

      case WorkerMessageType.sendHash:
        const binHashMsg = message as NextGuiServerMessage;
        if (this._ws) {
          this._ws.send(packEncodedHash(binHashMsg.binHash));
        }
        break;

      default:
        console.error(
          `Unrecognized message type received from main thread: ${message.type}`
        );
    }
  }

  /**
   * Internal Logic: Starts the Websocket connection
   */
  private _startSession(wsProxyURL: string, host: string, port: number) {
    this._guiServerHost = host;
    this._guiServerPort = port;

    // Close existing connection if any
    if (this._ws) {
      this._ws.close();
    }

    this._ws = new WebsocketBuilder(wsProxyURL)
      .onOpen(this._onWsOpen)
      .onMessage(this._onWsMessage)
      .onError(this._onWsError)
      .build();
  }

  /**
   * Internal Logic: Pops the next hash and sends it to Main Thread
   */
  private _sendNextMessage() {
    const binHash = this._hashDeque.popHash();

    if (binHash) {
      postMessage({
        type: WorkerMessageType.nextGuiServerMessage,
        binHash: binHash,
        queuedItemsCount: this._hashDeque.itemsCount,
        latestLatency: this._hashDeque.latestLatency,
      } as NextGuiServerMessage);
    }
  }

  // #region Websocket Event Handlers

  private _onWsOpen(ws: Websocket, _ev: Event) {
    // Send the initial handshake with host/port
    ws.send(
      JSON.stringify({
        host: this._guiServerHost,
        port: this._guiServerPort,
      })
    );
  }

  private _onWsMessage(ws: Websocket, ev: MessageEvent<any>) {
    if (typeof ev.data === 'string') {
      // Handle textual error messages (e.g. "0|Connection failed")
      const errMsg = (
        ev.data.startsWith('0|') ? ev.data.substring(2) : ev.data
      ).trim();

      postMessage({
        type: WorkerMessageType.error,
        message: errMsg,
      } as SessionErrorMessage);

      ws.close();
      close(); // Terminate the worker
    } else {
      // Handle binary Hash data
      const msgBlob = ev.data as Blob;
      msgBlob.arrayBuffer().then((binHash: ArrayBuffer) => {
        this._hashDeque.pushHash(binHash);
        // Notify main thread that data is ready
        postMessage({
          type: WorkerMessageType.guiServerMessageReceived,
        });
      });
    }
  }

  private _onWsError(ws: Websocket, ev: Event) {
    let message: string | undefined;

    if (!ws.underlyingWebsocket) {
      message = 'Websocket client initialization error';
    } else if (ws.underlyingWebsocket.CLOSED) {
      message = 'No connection to websocket server';
    } else if (ws.underlyingWebsocket.CLOSING) {
      message = 'Websocket connection being closed.';
    } else {
      message = ev.toString();
      ws.close();
    }

    postMessage({
      type: WorkerMessageType.error,
      message: message,
    } as SessionErrorMessage);

    close(); // Terminate the worker
  }
  // #endregion
}

// --------------------------------------------------------------------------
// Worker Entry Point
// --------------------------------------------------------------------------
const session = new GuiServerSession();

// Hook the class handler to the global worker event
self.onmessage = session.handleMessage;
