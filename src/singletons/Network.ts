import { decodeBinHash, packEncodedHash } from '../karabo_hash/hash_utils';
import { Websocket, WebsocketBuilder } from 'websocket-ts';
import { BinaryEncoder, Hash } from 'karabo-ts';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { useGlobalActivityStore } from '../store/globalActivityStore';
import { GuiServerInfo } from '@/karabo_data/GuiServerInfo';
import { guiServerInfoFromHash } from '../karabo_hash/decoders/gui_session';
import { HashDeque } from '../karabo_hash/HashDeque';
import { buildLoginHash } from '../karabo_hash/builders/gui_session';
import { GuiSessionStore, GuiSessionData } from '../store/GuiSessionStore';
import AuthServerClient from '../http/AuthServerClient';
import { AccessLevel } from '@/karabo_data/SchemaEnums';

// --- Types ---
const MAX_ITEM_PROCESSING = 5;

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
  private _ws?: Websocket;
  private _hashDeque = new HashDeque();
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _onSessionDropped?: (err_msg: string) => void;

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

  public get onSessionDropped(): ((err_msg: string) => void) | undefined {
    return this._onSessionDropped;
  }

  public set onSessionDropped(value: ((err_msg: string) => void) | undefined) {
    if (value != undefined && this._onSessionDropped != undefined) {
      throw new Error('Cannot set onSessionDropped: a handler is already set');
    }
    this._onSessionDropped = value;
  }

  public sendHash(hash: Hash): void {
    if (!this._ws) {
      console.warn(
        'Invalid use of sendHash! No active GUI Server session exists!'
      );
      return;
    }
    const encodedHash = new BinaryEncoder().encodeHash(hash);
    this._ws.send(packEncodedHash(encodedHash));
  }

  // #endregion

  // #region Probing

  public probeServer(
    host: string,
    port: number,
    onSuccess: (serverInfo: GuiServerInfo) => void,
    onError: (errMsg: string) => void
  ): void {
    new WebsocketBuilder(this._wsProxyURL)
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
            const hash = decodeBinHash(binHash);
            const guiServerInfo = guiServerInfoFromHash(hash);
            onSuccess(guiServerInfo);
            ws.close();
          });
        }
      })
      .onError((ws, ev) => this._handleWsError(ws, ev, onError))
      .build();
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
    authServerCli: AuthServerClient,
    onResumedHandler: SessionStartedHandler,
    onNoSessionHandler: () => void,
    onErrorHandler: SessionStartErrorHandler
  ): Promise<void> {
    if (this._session) return;

    let sessionData: GuiSessionData | undefined;
    try {
      sessionData = await GuiSessionStore.inst.loadGuiSessionData();
      if (!sessionData) {
        onNoSessionHandler();
        return;
      }

      this.probeServer(
        sessionData.host,
        sessionData.port,
        async (serverInfo: GuiServerInfo) => {
          const isServerAuthenticated = serverInfo.authRequired;
          const sessionDataAuthenticated =
            sessionData!.refreshToken != undefined;

          if (isServerAuthenticated != sessionDataAuthenticated) {
            GuiSessionStore.inst.deleteGuiSession();
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
            const res = await authServerCli.refreshTokens(
              sessionData!.refreshToken!,
              sessionData!.userId
            );

            if (!res.success) {
              GuiSessionStore.inst.deleteGuiSession();
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

            await GuiSessionStore.inst.saveAuthGuiSession(
              sessionData!.host,
              sessionData!.port,
              sessionData!.userId,
              res.refresh_token!
            );
          }
          this._startWebsocketSession(sessionData!.host, sessionData!.port);
        },
        (error_msg: string) => {
          GuiSessionStore.inst.deleteGuiSession();
          onErrorHandler(`Failed to probe server: "${error_msg}".`);
        }
      );
    } catch (error: any) {
      GuiSessionStore.inst.deleteGuiSession();
      onErrorHandler(error.toString());
    }
  }

  public finishSession(): void {
    this._session = undefined;
    this._stopWebsocketSession();
    GuiSessionStore.inst.deleteGuiSession();
    useGlobalActivityStore.getState().reset();
  }

  // #endregion

  // #region WebSocket Logic

  private _startWebsocketSession(host: string, port: number) {
    this._stopTimer();
    this._hashDeque = new HashDeque();
    if (this._ws) this._ws.close();

    this._ws = new WebsocketBuilder(this._wsProxyURL)
      .onOpen((ws) => ws.send(JSON.stringify({ host, port })))
      .onMessage(this._onWsMessage)
      .onError((ws, ev) =>
        this._handleWsError(ws, ev, (msg) => this._handleSessionError(msg))
      )
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
        this._hashDeque.pushHash(binHash);
        this._ensureTimerRunning();
      });
    }
  };

  private _handleWsError(
    ws: Websocket,
    ev: Event,
    callback: (msg: string) => void
  ) {
    let message: string | undefined;
    if (!ws.underlyingWebsocket)
      message = 'Websocket client initialization error';
    else if (ws.underlyingWebsocket.CLOSED)
      message = 'No connection to websocket server';
    else if (ws.underlyingWebsocket.CLOSING)
      message = 'Websocket connection being closed.';
    else message = ev.toString();

    ws.close();
    if (callback && message) callback(message);
  }

  private _handleSessionError(message: string) {
    if (this._session) {
      this._session.startErrorHandler(message);
      this._session = undefined;
    } else if (this._onSessionDropped) {
      this._onSessionDropped(message);
    }
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
    while (this._hashDeque.itemsCount > 0 && taskCounter > 0) {
      const binHash = this._hashDeque.popHash();
      if (binHash) {
        // Emit the data "signal"
        if (this.onReceivedData) {
          this.onReceivedData(binHash);
        }
      }
      taskCounter--;
    }

    useGlobalActivityStore
      .getState()
      .updateActivity(
        this._hashDeque.itemsCount,
        this._hashDeque.latestLatency
      );

    if (this._hashDeque.itemsCount === 0) {
      this._stopTimer();
    }
  }

  // #endregion

  public performLogin() {
    if (!this._session) return;
    let loginHash: Hash;
    if (this._session.isAuthSession) {
      loginHash = buildLoginHash(
        'KIWI',
        '3.0.0',
        this._session.oneTimeToken,
        undefined
      );
    } else {
      loginHash = buildLoginHash(
        'KIWI',
        '3.0.0',
        undefined,
        this._session.userId
      );
    }
    this.sendHash(loginHash);
  }
}
