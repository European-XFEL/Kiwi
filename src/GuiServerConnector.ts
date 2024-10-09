import { buildLoginHash } from "./karabo_hash/builders/gui_session";
import { sysTopologyInfoFromHash } from "./karabo_hash/decoders/topology";
import {
  guiServerInfoFromHash,
  loginInfoFromHash,
  notificationInfoFromHash,
} from "./karabo_hash/decoders/gui_session";

import {
  blobToHash,
  hashProtocolType,
  packEncodedHash,
} from "./karabo_hash/hash_utils";

import { AccessLevel } from "./karabo_data/AccessLevel";
import { GuiServerInfo } from "./karabo_data/GuiServerInfo";

import { Websocket, WebsocketBuilder } from "websocket-ts";

import { BinaryEncoder, Hash } from "karabo-ts";

import { store } from "./store";
import { setTopology } from "./store/slices/sysTopologySlice";
import { GuiSessionData, GuiSessionStore } from "./store/GuiSessionStore";
import AuthServerClient from "./http_clients/AuthServerClient";

type SessionStartedHandler = (
  accessLevel: AccessLevel,
  host: string,
  port: number,
  userId: string,
  topic: string,
  serverVersion: string
) => void;

type SessionStartErrorHandler = (errMsg: string) => void;

interface GuiServerSession {
  host: string;
  port: number;
  topic?: string; // not known at creation time; obtained from server message.
  serverVersion?: string; // not known at creation time; obtained from server message.
  ws: Websocket;
  isAuthSession: boolean;
  userLogged: boolean;
  userId?: string; // only defined for non-auth sessions - sent by the GUI client.
  accessLevel?: AccessLevel;
  oneTimeToken?: string; // only defined for auth sessions - sent by the GUI client.
  refreshToken?: string; // only defined for auth sessions - sent by the GUI client.
  projectDBInitialized: boolean;
  startHandler: SessionStartedHandler;
  startErrorHandler: SessionStartErrorHandler;
}

const SESSION_DROPPED_ERROR_MSG =
  "GUI Server connection lost unexpectedly. More details in the browser console.";

export class GuiServerConnector {
  // #region Singleton support
  private constructor() {}

  static get #_wsProxyURL(): string {
    return store.getState().appSettings.ws_proxy_url;
  }

  static #_inst?: GuiServerConnector;
  static get inst(): GuiServerConnector {
    if (!GuiServerConnector.#_inst) {
      GuiServerConnector.#_inst = new GuiServerConnector();
    }
    return GuiServerConnector.#_inst;
  }
  // #endregion

  #_session?: GuiServerSession;

  sendHash(hash: Hash): void {
    if (!this.#_session) {
      console.log(
        "Invalid use of sendHash! No active GUI Server session exists!"
      );
      return;
    }
    const encodedHash = new BinaryEncoder().encodeHash(hash);
    this.#_session.ws.send(packEncodedHash(encodedHash));
  }

  /**
   * Has the connection to the ProjectDB database been initialized for the current GUI Session?
   *
   * @returns true if the connection has been initialized, false otherwise.
   */
  get isProjectDBInitialized(): boolean {
    return this.#_session?.projectDBInitialized ?? false;
  }

  set projectDBInitialized(initialized: boolean) {
    if (!this.#_session) {
      console.log(
        "Invalid use of set ProjectDBInitialized! No active GUI Server session exists!"
      );
      return;
    }
    this.#_session.projectDBInitialized = initialized;
  }

  /**
   * Checks if there is a Karabo GUI Server listening at a
   * given host:port combination. If there is calls a success
   * handler with the information sent by the GUI server upon
   * connection. The communication is intermediated by a
   * WebSocketProxy instance.
   *
   * @param host hostname of the GUI Server to be probed.
   * @param port port of the GUI Server to be probed.
   * @param onSuccess handler for the successful checking case.
   * @param onError handler for the failing checking case.
   */
  probeServer(
    host: string,
    port: number,
    onSuccess: (serverInfo: GuiServerInfo) => void,
    onError: (errMsg: string) => void
  ): void {
    new WebsocketBuilder(GuiServerConnector.#_wsProxyURL)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .onOpen((ws, _ev) => {
        ws.send(JSON.stringify({ host: host, port: port }));
      })
      .onMessage((ws, ev) => {
        if (typeof ev.data === "string") {
          // The only occasions when the WebSocketProxy does not send a
          // binary serialized Hash are when it communicates an error for
          // connecting to the GUI Server or when it loses the connection to
          // the GUI Server. On those occasions, the message is a string in
          // the format "0|<error message>".
          onError(`No GUI server available at "${host}:${port}"`);
          // Output the full error to the console
          console.log(`Probing of "${host}:${port}" failed:`);
          console.log(ev.data);
          ws.close();
        } else {
          // As the probing process only sends a connection request,
          // waits for the GUI Server to send a "ServerInfo" message and then
          // disconnects, we have to be dealing with a "ServerInfo" message.
          blobToHash(ev.data).then((hash: Hash) => {
            const serverInfoHash = guiServerInfoFromHash(hash);
            onSuccess(serverInfoHash);
            ws.close();
          });
        }
      })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .onError((ws, _ev) => {
        if (!ws.underlyingWebsocket) {
          onError("Websocket client initialization error");
        } else {
          if (ws.underlyingWebsocket?.CLOSED) {
            // Connection could not be established or couldn't be opened.
            onError("No connection to websocket server");
          } else if (ws.underlyingWebsocket?.CLOSING) {
            onError("Websocket connection being closed.");
          } else {
            onError(`Server ${ws.underlyingWebsocket?.url} not available`);
            ws.close();
          }
        }
      })
      .build();
  }

  // #region GUI Session lifecycle methods

  /**
   * Helper method to initialize an instance of an authenticated session.
   */
  #_buildAuthSession = (
    host: string,
    port: number,
    userId: string,
    oneTimeToken: string,
    refreshToken: string,
    startHandler: SessionStartedHandler,
    startErrorHandler: SessionStartErrorHandler
  ) => {
    return {
      host: host,
      port: port,
      userId: userId,
      ws: new WebsocketBuilder(GuiServerConnector.#_wsProxyURL)
        .onOpen(this.#_onWsOpen)
        .onMessage(this.#_onWsMessage)
        .onError(this.#_onWsError)
        .build(),
      isAuthSession: true,
      userLogged: false,
      oneTimeToken: oneTimeToken,
      refreshToken: refreshToken,
      projectDBInitialized: false,
      startHandler: startHandler,
      startErrorHandler: startErrorHandler,
    };
  };

  /**
   * Helper method to initialize an instance of a non-authenticated session.
   */
  #_buildNonAuthSession = (
    host: string,
    port: number,
    userId: string,
    accessLevel: AccessLevel,
    startHandler: SessionStartedHandler,
    startErrorHandler: SessionStartErrorHandler
  ) => {
    return {
      host: host,
      port: port,
      ws: new WebsocketBuilder(GuiServerConnector.#_wsProxyURL)
        .onOpen(this.#_onWsOpen)
        .onMessage(this.#_onWsMessage)
        .onError(this.#_onWsError)
        .build(),
      isAuthSession: false,
      userLogged: false,
      userId: userId,
      accessLevel: accessLevel,
      projectDBInitialized: false,
      startHandler: startHandler,
      startErrorHandler: startErrorHandler,
    };
  };

  startAuthSession(
    host: string,
    port: number,
    userId: string,
    oneTimeToken: string,
    refreshToken: string,
    onStartedHandler: (
      accessLevel: AccessLevel,
      host: string,
      port: number,
      topic: string,
      serverVersion: string
    ) => void,
    onErrorHandler: (errMsg: string) => void
  ): void {
    if (this.#_session) {
      console.log(
        "Invalid use of startAuthSession! An active GUI Server session already exists!"
      );
      return;
    }
    this.#_session = this.#_buildAuthSession(
      host,
      port,
      userId,
      oneTimeToken,
      refreshToken,
      onStartedHandler,
      onErrorHandler
    );
  }

  startNonAuthSession(
    host: string,
    port: number,
    userId: string,
    accessLevel: AccessLevel,
    onStartedHandler: (
      accessLevel: AccessLevel,
      host: string,
      port: number,
      topic: string,
      serverVersion: string
    ) => void,
    onErrorHandler: (errMsg: string) => void
  ): void {
    if (this.#_session) {
      console.log(
        "Invalid use of startNonAuthSession! An active GUI Server session already exists!"
      );
      return;
    }
    this.#_session = this.#_buildNonAuthSession(
      host,
      port,
      userId,
      accessLevel,
      onStartedHandler,
      onErrorHandler
    );
  }

  async resumeGuiSession(
    authServerCli: AuthServerClient,
    onResumedHandler: (
      accessLevel: AccessLevel,
      host: string,
      port: number,
      userId: string,
      topic: string,
      serverVersion: string
    ) => void,
    onNoSessionHandler: () => void,
    onErrorHandler: (errMsg: string) => void
  ): Promise<void> {
    if (this.#_session) {
      console.log(
        "Invalid use of resumeGuiSession! An active GUI Server session already exists!"
      );
      return;
    }
    let sessionData: GuiSessionData | undefined;
    try {
      sessionData = await GuiSessionStore.inst.loadGuiSessionData();
      if (!sessionData) {
        // There's no session to resume
        onNoSessionHandler();
      } else {
        // We must probe the server of the session to be resumed to be sure
        // that it is still there and its authentication mode matches the
        // sessionData.
        this.probeServer(
          sessionData.host,
          sessionData.port,
          // Handles probing success
          async (serverInfo: GuiServerInfo) => {
            const isServerAuthenticated = serverInfo.authRequired;
            const sessionDataAuthenticated =
              sessionData!.refreshToken != undefined;
            if (isServerAuthenticated != sessionDataAuthenticated) {
              // Mismatch between current server auth mode and mode in session data; abort resume.
              GuiSessionStore.inst.deleteGuiSession();
              onErrorHandler(
                "Session to resume doesn't match current authentication mode of the GUI server. Resume aborted."
              );
              return;
            }
            if (sessionData!.refreshToken == undefined) {
              // There is a non-authenticated GUI session to be resumed
              this.#_session = this.#_buildNonAuthSession(
                sessionData!.host,
                sessionData!.port,
                sessionData!.userId,
                sessionData!.accessLevel!,
                onResumedHandler,
                onErrorHandler
              );
            } else {
              // There is an authenticated GUI session to be resumed
              // Obtain a onetime token from the refresh token
              const res = await authServerCli.refreshTokens(
                sessionData!.refreshToken!,
                sessionData!.userId
              );
              if (!res.success) {
                // As the session data does not allow successful resume, delete it
                GuiSessionStore.inst.deleteGuiSession();
                onErrorHandler(res.error_msg!);
                return;
              }
              this.#_session = this.#_buildAuthSession(
                sessionData!.host,
                sessionData!.port,
                sessionData!.userId,
                res.once_token!,
                res.refresh_token!,
                onResumedHandler,
                onErrorHandler
              );
              // Update the stored session data with the new refresh token
              await GuiSessionStore.inst.saveAuthGuiSession(
                sessionData!.host,
                sessionData!.port,
                sessionData!.userId,
                res.refresh_token!
              );
            }
          }, // end of probing success handler
          // Handles probing failure - abort resume
          (error_msg: string) => {
            GuiSessionStore.inst.deleteGuiSession();
            onErrorHandler(
              `Failed to get current authentication mode of the GUI server: "${error_msg}". Resume session aborted.`
            );
            return;
          }
        ); // this.probeServer(...)
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      // As the session data does not allow successful resume, delete it
      GuiSessionStore.inst.deleteGuiSession();
      onErrorHandler(error.toString());
      return;
    }
  }

  #_onSessionDropped?: (err_msg: string) => void;
  /**
   * Handler for unexpected GUI Server session drops - to be injected by an interested party.
   */
  get onSessionDropped(): ((err_msg: string) => void) | undefined {
    return this.#_onSessionDropped;
  }
  /**
   * Allows an external party (only one at a time) to set a handler for unexpected GUI Server session drop events.
   */
  set onSessionDropped(value: ((err_msg: string) => void) | undefined) {
    if (value != undefined && this.#_onSessionDropped != undefined) {
      throw new Error("Cannot set onSessionDropped: a handler is already set");
    }
    this.#_onSessionDropped = value;
  }

  finishSession(): void {
    this.#_session?.ws.close();
    this.#_session = undefined;
    GuiSessionStore.inst.deleteGuiSession();
  }
  // #endregion

  // #region Websocket event handlers

  /**
   * Handler for successful connections to the WebSocketProxy.
   *
   * @param ws the web socket client that was successfully connected.
   * @param _ev the connection event (not used).
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  #_onWsOpen = (ws: Websocket, _ev: Event): any => {
    // A GUI Server session always starts with a message instructing the
    // WebSocketProxy to connect to a GUI Server.
    ws.send(
      JSON.stringify({ host: this.#_session?.host, port: this.#_session?.port })
    );
  };

  /**
   * Handler for websocket messages received from the WebSocketProxy during a
   * GUI Server session.
   *
   * @param ws the websocket client that got the messsage.
   * @param ev the message event - message payload in the data property.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #_onWsMessage = (ws: Websocket, ev: MessageEvent<any>): any => {
    if (typeof ev.data === "string") {
      // The only occasions when the WebSocketProxy does not send a
      // binary serialized Hash are when it communicates an error for
      // connecting to the GUI Server or when it loses the connection to
      // the GUI Server. On those occasions, the message is a string in
      // the format "0|<error message>".
      const err_msg = (
        ev.data.startsWith("0|") ? ev.data.substring(2) : ev.data
      ).trim();
      if (this.#_session?.userLogged) {
        // If there was a user logged to the GUI Server when the connection
        // was lost communicate the event as a session drop.
        this.#_onSessionDropped?.(SESSION_DROPPED_ERROR_MSG);
        console.error(`Session dropped: ${err_msg}`);
      } else {
        // If there was no user logged yet, consider it as a session start error.
        this.#_session?.startErrorHandler(err_msg);
      }
      ws.close();
      this.#_session = undefined;
    } else {
      blobToHash(ev.data).then((hash: Hash) => {
        const protocolType = hashProtocolType(hash);
        if (
          protocolType === "brokerInformation" ||
          protocolType === "serverInformation"
        ) {
          this.#_handleBrokerInformation(ws, hash);
        } else if (protocolType === "loginInformation") {
          this.#_handleLoginInformation(hash);
        } else if (protocolType === "notification") {
          this.#_handleNotification(hash);
        } else if (protocolType === "systemTopology") {
          this.#_handleSystemTopology(hash);
        } else if (this.#_hashHandlers.has(protocolType)) {
          // There is a handler currently registered for the protocol type - call it
          this.#_hashHandlers.get(protocolType)!(hash);
        }

        // TODO: (???) register the message received in the messages slice of the Redux Store.
      });
    }
  };

  /**
   * Handler for errors in the connection with the WebSocketProxy.
   *
   * @param ws the websocket client for which the error ocurred.
   * @param ev the error event (not used).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #_onWsError = (ws: Websocket, ev: Event): any => {
    if (this.#_session?.userLogged) {
      // A WebSocket error while there's a user logged to a GUI Server is
      // interpreted as a session drop.
      this.#_onSessionDropped?.(SESSION_DROPPED_ERROR_MSG);
      console.error(console.error(`Session dropped: ${ev.toString()}`));
      if (ws.underlyingWebsocket) {
        ws.close();
      }
    } else {
      // A WebSocket error before there's a user logged to a GUI Server is
      // interpreted as a session start error.
      if (!ws.underlyingWebsocket) {
        this.#_session?.startErrorHandler(
          "Websocket client initialization error"
        );
      } else {
        if (ws.underlyingWebsocket?.CLOSED) {
          // Connection could not be established or couldn't be opened.
          this.#_session?.startErrorHandler(
            "No connection to websocket server"
          );
        } else if (ws.underlyingWebsocket?.CLOSING) {
          this.#_session?.startErrorHandler(
            "Websocket connection being closed."
          );
        } else {
          this.#_session?.startErrorHandler(
            `Server ${ws.underlyingWebsocket?.url} not available`
          );
          ws.close();
        }
      }
    }
    this.#_session = undefined;
  };

  // #endregion

  // #region Internal Hash handlers

  #_handleBrokerInformation = (ws: Websocket, hash: Hash): void => {
    // "brokerInformation" (or "serverInformation"; deprecated) are special
    // cases. They're sent by the GUI Server right after a connection is established
    // and must trigger the sending of a login message to the GUI Server.
    // We use the GUI Server sent message here to extract the topic and
    // version of the GUI Server being connected to.
    const serverInfo = guiServerInfoFromHash(hash);
    this.#_session!.topic = serverInfo.topic;
    this.#_session!.serverVersion = serverInfo.version;
    let loginHash: Hash;
    if (this.#_session?.isAuthSession) {
      loginHash = buildLoginHash(
        "KIWI",
        "2.20.0", // Must be >= 2.20.0 - the version required by the GUI Server for auth logins.
        this.#_session?.oneTimeToken,
        undefined
      );
    } else {
      loginHash = buildLoginHash(
        "KIWI",
        "2.20.0", // Must be >= 2.20.0 - the version required by the GUI Server for auth logins.
        undefined,
        this.#_session?.userId
      );
    }
    const loginMsg = new BinaryEncoder().encodeHash(loginHash);
    ws.send(packEncodedHash(loginMsg));

    if (!this.#_session?.isAuthSession) {
      console.log(
        `Saving non-auth session data. this.#_session=${JSON.stringify(
          this.#_session
        )}`
      );
      GuiSessionStore.inst.saveNonAuthGuiSession(
        this.#_session!.host,
        this.#_session!.port,
        this.#_session!.userId!,
        this.#_session!.accessLevel!
      );

      // A non authenticated login is immediately followed by the sending of the systemTopology;
      // there's no reply for the login. So we immediately call the non-Auth handler.
      this.#_session!.userLogged = true;
      this.#_session!.startHandler!(
        this.#_session!.accessLevel!,
        this.#_session!.host,
        this.#_session!.port,
        this.#_session!.userId!,
        this.#_session!.topic,
        this.#_session!.serverVersion
      );
    }
  };

  #_handleLoginInformation = (hash: Hash): void => {
    // "loginInformation" is sent by the GUI Server in response to a successful
    // authenticated login request. We call the auth handler passing the
    // authorized Access Level. Any login error will be informed via a "notification"
    // message sent by the GUI Server - "notification" is not necessarily used to
    // communicate an error.
    const loginInfoHash = loginInfoFromHash(hash);
    //   console.log(
    //     `Saving auth session data. loginInfoHash = ${JSON.stringify(
    //       loginInfoHash
    //     )}\n this.#_session=${JSON.stringify(this.#_session)}`
    //   );
    GuiSessionStore.inst.saveAuthGuiSession(
      this.#_session!.host,
      this.#_session!.port,
      this.#_session!.userId!,
      this.#_session!.refreshToken!
    );
    this.#_session?.startHandler!(
      loginInfoHash.accessLevel,
      this.#_session!.host,
      this.#_session!.port,
      this.#_session!.userId!,
      // We can count on topic and serverVersion being defined, because they were
      // on the payload of a "brokerInformation" (or "serverInformation") message
      // that certainly has been received after the connection to the GUI server
      // was established.
      this.#_session!.topic!,
      this.#_session!.serverVersion!
    );
    this.#_session!.userLogged = true;
  };

  #_handleNotification = (hash: Hash): void => {
    if (!this.#_session?.userLogged) {
      // a "notification" message before the user is logged is interpreted
      // as a login error.
      const notificationHash = notificationInfoFromHash(hash);
      this.#_session?.startErrorHandler(notificationHash.message);
    }
  };

  #_handleSystemTopology = (hash: Hash): void => {
    // Initial topology received - update the topology slice of the Redux Store.
    const sysTopologyInfo = sysTopologyInfoFromHash(hash);
    store.dispatch(setTopology(sysTopologyInfo));
  };

  // #endregion

  // #region Dynamic Hash Handlers

  #_hashHandlers = new Map<string, (hash: Hash) => void>();

  /**
   * Registers a handler for a hash type.
   *
   * @param hashType Registered hash type
   * @param handler The handler function
   * @throws Error if a handler for the hash type is already registered
   */
  registerHashHandler(hashType: string, handler: (hash: Hash) => void): void {
    if (this.#_hashHandlers.has(hashType)) {
      throw new Error(`Hash handler for type ${hashType} already registered`);
    }
    this.#_hashHandlers.set(hashType, handler);
  }

  /**
   * Unregisters a handler for a hash type. Silently ignores if no handler is registered.
   *
   * @param hashType Hash type whose handler is to be unregistered
   */
  unregisterHashHandler(hashType: string): void {
    this.#_hashHandlers.delete(hashType);
  }

  // #endregion
}
