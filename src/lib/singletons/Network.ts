import { GuiServerInfo } from '@/features/login/auth.types';
import { broadcast_event, KaraboEvent } from '@/lib/events';
import { probeServer } from '@/features/login/utils';

import AuthServerClient from '@/lib/http/AuthServerClient';
import { encodeBinary, AccessLevel, Hash, HashList } from '@/karabo/data/api';
import { Deque } from '@datastructures-js/deque';

import { getConfig } from '@/lib/singletons/api';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { useGlobalActivityStore } from '@/store/globalActivityStore';
import { Websocket, WebsocketBuilder } from 'websocket-ts';

const MAX_ITEM_PROCESSING = 5;
const REQUEST_REPLY_TIMEOUT = 5;
const KIWI_GUI_CLIENT_VERSION = '3.1.0';

type BinHashItem = { bin: ArrayBuffer; time: number };

export type SessionStartedHandler = (
  accessLevel: AccessLevel,
  host: string,
  port: number,
  userId: string,
  topic: string,
  serverVersion: string
) => void;

export type SessionStartErrorHandler = (errMsg: string) => void;

export interface GuiServerSession {
  host: string;
  port: number;
  topic?: string;
  serverVersion?: string;
  isAuthSession: boolean;
  userLogged: boolean;
  userId?: string;
  accessLevel?: AccessLevel;
  oneTimeToken?: string;
  refreshToken?: string;
  startHandler: SessionStartedHandler;
  startErrorHandler: SessionStartErrorHandler;
}

export class Network {
  // "Signal" for received data
  public onReceivedData?: (binHash: ArrayBuffer) => void;

  // Session State
  private _session?: GuiServerSession;
  private _closeRequested = false; // when true (e.g. user logout), web socket connection closes are expected and are not errors
  private _sessionExpired = false; //
  private _ws?: Websocket;
  private _hashDeque = new Deque<BinHashItem>();
  private _timer: ReturnType<typeof setInterval> | null = null;

  public constructor() {}

  private get _wsProxyURL(): string {
    return useAppSettingsStore.getState().wsProxyURL;
  }

  // #region Public API

  public get session(): GuiServerSession | undefined {
    return this._session;
  }

  public updateSessionServerInfo(topic: string, version: string) {
    if (this._session) {
      this._session.topic = topic;
      this._session.serverVersion = version;
    }
  }

  public updateSessionAuth(accessLevel: AccessLevel, refreshToken?: string) {
    if (this._session) {
      this._session.userLogged = true;
      if (accessLevel) this._session.accessLevel = accessLevel;
      if (refreshToken) this._session.refreshToken = refreshToken;
    }
  }

  public sendHash(hash: Hash): void {
    if (!this._ws) {
      console.debug(
        `Attempt to sendHash after websocket connection is gone: hash = ${hash}`
      );
      return;
    }
    const payloadBuf = encodeBinary(hash);
    // View, no copy
    const payload = new Uint8Array(payloadBuf);

    const data = new Uint8Array(4 + payload.byteLength);

    const header = new DataView(data.buffer);
    header.setUint32(0, payload.byteLength, true); // little-endian length prefix

    data.set(payload, 4);

    this._ws.send(data);
  }

  // #endregion

  // #region Session Lifecycle

  public startAuthSession(
    host: string,
    port: number,
    userId: string,
    oneTimeToken: string,
    refreshToken: string,
    onStartedHandler: SessionStartedHandler,
    onErrorHandler: SessionStartErrorHandler
  ): void {
    if (this._session) return;
    this._session = {
      host,
      port,
      userId,
      oneTimeToken,
      refreshToken,
      isAuthSession: true,
      userLogged: false,
      startHandler: onStartedHandler,
      startErrorHandler: onErrorHandler,
    };
    this._startWebsocketSession(host, port);
  }

  public startNonAuthSession(
    host: string,
    port: number,
    userId: string,
    accessLevel: AccessLevel,
    onStartedHandler: SessionStartedHandler,
    onErrorHandler: SessionStartErrorHandler
  ): void {
    if (this._session) return;
    this._session = {
      host,
      port,
      userId,
      accessLevel,
      isAuthSession: false,
      userLogged: false,
      startHandler: onStartedHandler,
      startErrorHandler: onErrorHandler,
    };
    this._startWebsocketSession(host, port);
  }

  public async resumeGuiSession(
    onResumedHandler: SessionStartedHandler,
    onNoSessionHandler: () => void,
    onErrorHandler: SessionStartErrorHandler
  ): Promise<void> {
    if (this._session) return;

    try {
      let sessionData = await getConfig().loadSession();
      if (!sessionData) {
        onNoSessionHandler();
        return;
      }

      probeServer(
        sessionData.host,
        sessionData.port,
        // onProbeSuccess
        async (serverInfo: GuiServerInfo) => {
          const authRequired = serverInfo['authRequired'] as boolean;
          const isServerAuthenticated = authRequired;
          const sessionDataAuthenticated =
            sessionData!.refreshToken != undefined;

          if (isServerAuthenticated != sessionDataAuthenticated) {
            getConfig().deleteSession();
            onErrorHandler(
              'Session authentication mode mismatch. Resume aborted.'
            );
            return;
          }

          if (sessionData!.refreshToken == undefined) {
            // Non-auth resume
            this._session = {
              host: sessionData!.host,
              port: sessionData!.port,
              userId: sessionData!.userId,
              accessLevel: sessionData!.accessLevel!,
              isAuthSession: false,
              userLogged: false,
              startHandler: onResumedHandler,
              startErrorHandler: onErrorHandler,
            };
          } else {
            // Auth resume
            const authServerCli = new AuthServerClient(serverInfo.authServer);
            const res = await authServerCli.refreshTokens(
              sessionData!.refreshToken!,
              sessionData!.userId
            );

            if (!res.success) {
              getConfig().deleteSession();
              onErrorHandler(res.error_msg!);
              return;
            }

            this._session = {
              host: sessionData!.host,
              port: sessionData!.port,
              userId: sessionData!.userId,
              oneTimeToken: res.once_token!,
              refreshToken: res.refresh_token!,
              isAuthSession: true,
              userLogged: false,
              startHandler: onResumedHandler,
              startErrorHandler: onErrorHandler,
            };

            await getConfig().saveAuthSession(
              sessionData!.host,
              sessionData!.port,
              sessionData!.userId,
              res.refresh_token!
            );
          }
          this._startWebsocketSession(sessionData!.host, sessionData!.port);
        },
        // onProbeError
        (error_msg: string) => {
          getConfig().deleteSession();
          onErrorHandler(`Failed to probe server: "${error_msg}".`);
        }
      );
    } catch (error: any) {
      getConfig().deleteSession();
      onErrorHandler(error.toString());
    }
  }

  public expireSession(): void {
    this._session = undefined;
    this._sessionExpired = true;
    this._stopWebsocketSession();
    getConfig().deleteSession();
    useGlobalActivityStore.getState().reset();
  }

  public finishSession(): void {
    this._session = undefined;
    this._closeRequested = true;
    this._stopWebsocketSession();
    getConfig().deleteSession();
    useGlobalActivityStore.getState().reset();
  }

  // #endregion

  // #region WebSocket Logic

  /**
   * Retrieves the message corresponding to a given websocket event.
   *
   * @param ws the websocket connection that sources the event
   * @param ev the websocket event
   * @returns the message corresponding to the event
   */
  public websocketEventMessage(ws: Websocket, ev: Event): string {
    let message: string | undefined;
    if (!ws.underlyingWebsocket)
      message = 'Websocket client initialization error';
    else if (ws.underlyingWebsocket.CLOSED)
      message = 'No connection to GUI server - web socket closed';
    else if (ws.underlyingWebsocket.CLOSING)
      message = 'No connection to GUI server - web socket closing';
    else message = ev.toString();
    return message;
  }

  private _startWebsocketSession(host: string, port: number) {
    this._stopTimer();
    this._hashDeque = new Deque();
    if (this._ws) this._ws.close();

    // Initialize the two possible connection modes: direct connection to a GUI
    // server web socket port (empty wsProxyURL) or proxy-intermediated connection
    // to an older GUI server with only a tcp port
    const useWebSocketProxy: boolean =
      this._wsProxyURL !== undefined && this._wsProxyURL.length > 0;
    const websocketURL = useWebSocketProxy
      ? this._wsProxyURL
      : `ws://${host}:${port}`;

    this._ws = new WebsocketBuilder(websocketURL)
      .onOpen((ws) => {
        if (useWebSocketProxy) {
          // When the connection to the GUI server is intermediated by a web socket proxy,
          // the target GUI Server host and port must be sent for the proxy to initialize
          // the connection
          ws.send(JSON.stringify({ host, port }));
        }
      })
      .onClose((ws, ev) => {
        if (!this._closeRequested && !this._sessionExpired) {
          // Outside normal session finishes (e.g. user logouts) and session
          // expirations, a web socket close is considered an error.
          this._handleWsError(ws, ev, (msg) => this._handleSessionError(msg));
        } else if (this._closeRequested) {
          // the web socket was closed as part of a normal session finish or
          // as part of a session expiration. Must reset the corresponding flags.
          // Note: The resets cannot be performed by neither of the setting
          // methods (expireSession and finishSession) because this handler is
          // only processed by the event loop after the settings methods have
          // returned.
          this._closeRequested = false;
        } else {
          // the web socket was closed as part of a session expiration. Must
          // reset the corresponding flag.
          // Note: The resets cannot be performed by the method expireSession
          // because this handler is only processed by the event loop after
          // expireSession has returned.
          broadcast_event(KaraboEvent.SessionExpired, new Hash({}));
          this._sessionExpired = false;
        }
      })
      .onMessage(this._onWsMessage)
      .onError((ws, ev) => {
        this._handleWsError(ws, ev, (msg) => this._handleSessionError(msg));
      })
      .build();
  }

  private _stopWebsocketSession() {
    this._stopTimer();
    this._ws?.close();
    this._ws = undefined;
  }

  private _onWsMessage = (ws: Websocket, ev: MessageEvent<any>) => {
    if (typeof ev.data === 'string') {
      const errMsg = (
        ev.data.startsWith('0|') ? ev.data.substring(2) : ev.data
      ).trim();
      this._handleSessionError(errMsg);
      ws.close();
      this._ws = undefined;
    } else {
      const msgBlob = ev.data as Blob;
      msgBlob.arrayBuffer().then((binHash: ArrayBuffer) => {
        this._hashDeque.pushBack({ bin: binHash, time: performance.now() });
        this._ensureTimerRunning();
      });
    }
  };

  private _handleWsError(
    ws: Websocket,
    ev: Event,
    callback: (msg: string) => void
  ) {
    let message = this.websocketEventMessage(ws, ev);
    ws.close();
    if (callback && message) callback(message);
  }

  private _handleSessionError(message: string) {
    broadcast_event(KaraboEvent.SessionDropped, new Hash('message', message));
    this._stopWebsocketSession();
  }

  // #endregion

  // #region Queue Processing

  private _ensureTimerRunning() {
    if (this._timer === null) {
      this._timer = setInterval(() => this._processQueueBatch(), 0);
    }
  }

  private _stopTimer() {
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  private _processQueueBatch() {
    let taskCounter = MAX_ITEM_PROCESSING;
    let latency = 0.0;

    while (this._hashDeque.size() > 0 && taskCounter > 0) {
      const item = this._hashDeque.popFront();
      if (!item) break;

      const { bin: binHash, time: queued_time } = item;
      latency = performance.now() - queued_time;
      if (binHash && this.onReceivedData) {
        this.onReceivedData(binHash);
      }

      taskCounter--;
    }

    useGlobalActivityStore
      .getState()
      .updateActivity(this._hashDeque.size(), latency);

    if (this._hashDeque.size() === 0) {
      this._stopTimer();
    }
  }

  // #endregion

  public performLogin() {
    if (!this._session) return;
    if (this._session.isAuthSession) {
      this.onLogin(
        'KIWI',
        KIWI_GUI_CLIENT_VERSION,
        this._session.oneTimeToken,
        undefined
      );
    } else {
      this.onLogin(
        'KIWI',
        KIWI_GUI_CLIENT_VERSION,
        undefined,
        this._session.userId
      );
    }
  }

  // Protocol
  // --------------------------------------------------------------------

  public onLogin(
    clientId: string,
    version: string,
    oneTimeToken?: string,
    clientUserId?: string
  ): void {
    const h = new Hash({
      type: 'login',
      clientId: clientId,
      version: version,
      ...(oneTimeToken && { oneTimeToken: oneTimeToken }),
      ...(clientUserId && { clientUserId: clientUserId }),
    });

    this.sendHash(h);
  }

  public onGetDeviceConfiguration(deviceId: string): void {
    const h = new Hash('type', 'getDeviceConfiguration', 'deviceId', deviceId);
    this.sendHash(h);
  }

  public onStartMonitoringDevice(deviceId: string): void {
    const h = new Hash('type', 'startMonitoringDevice', 'deviceId', deviceId);
    this.sendHash(h);
  }

  public onStopMonitoringDevice(deviceId: string): void {
    const h = new Hash('type', 'stopMonitoringDevice', 'deviceId', deviceId);
    this.sendHash(h);
  }

  public onGetDeviceSchema(deviceId: string): void {
    const h = new Hash('type', 'getDeviceSchema', 'deviceId', deviceId);
    this.sendHash(h);
  }

  public onExecute(deviceId: string, command: string): void {
    // prettier-ignore
    const h = new Hash('type', 'execute', 'deviceId', deviceId, 'command', command, 'reply', true);
    this.sendHash(h);
  }

  public onExecuteGeneric(
    instanceId: string,
    slotName: string,
    params: Hash,
    token?: string
  ): void {
    console.log(
      `Executing slot <b>${slotName}</b> of instance <b>${instanceId}</b>`
    );

    const h = new Hash();
    h.set('type', 'requestGeneric');

    if (token !== undefined) {
      h.set('token', token);
    }

    h.set('instanceId', instanceId);
    h.set('slot', slotName);
    h.set('args', params);
    h.set('timeout', REQUEST_REPLY_TIMEOUT);
    h.set('replyType', 'requestGeneric');

    this.sendHash(h);
  }

  public onReconfigure(deviceId: string, configuration: Hash): void {
    const h = new Hash({
      type: 'reconfigure',
      deviceId: deviceId,
      configuration: configuration,
      reply: true,
      timeout: REQUEST_REPLY_TIMEOUT,
    });
    this.sendHash(h);
  }

  public onProjectListDomains() {
    const hash = new Hash({
      type: 'requestGeneric',
      empty: true,
      timeout: 10,
      instanceId: 'KaraboProjectDB',
      slot: 'slotGenericRequest',
      replyType: 'projectListDomains',
    });
    hash.set('args.type', 'listDomains');
    this.sendHash(hash);
  }

  public onProjectListItems(domain: string) {
    const hash = new Hash({
      type: 'requestGeneric',
      args: new Hash({
        type: 'listItems',
        domain: domain,
        item_types: ['project'],
      }),
      // false causes the GUI Server to echo back the request parameters, from where the domain will be extracted
      empty: false,
      timeout: 10,
      instanceId: 'KaraboProjectDB',
      slot: 'slotGenericRequest',
      replyType: 'projectListItems',
    });
    this.sendHash(hash);
  }

  public onProjectLoadItems(itemsHashes: HashList) {
    const hash = new Hash({
      type: 'requestGeneric',
      empty: false,
      timeout: 10,
      instanceId: 'KaraboProjectDB',
      slot: 'slotGenericRequest',
      replyType: 'projectLoadItems',
    });
    hash.set('args.type', 'loadItems');
    hash.set('args.items', itemsHashes);
    this.sendHash(hash);
  }

  public onSubscribeToOutput(
    deviceId: string,
    path: string,
    subscribe: boolean
  ): void {
    const channelName = deviceId + ':' + path;
    // prettier-ignore
    const h = new Hash(
      'type', 'subscribeNetwork', 'deviceId', deviceId, 'channelName', channelName, 'subscribe', subscribe
    );
    this.sendHash(h);
  }

  public onRequestNetwork(channelName: string): void {
    const h = new Hash('type', 'requestNetwork', 'channelName', channelName);
    this.sendHash(h);
    console.log('Requesting network data', channelName);
  }
}
