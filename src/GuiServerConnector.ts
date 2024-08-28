import {
  blobToHash,
  hashProtocolType,
  buildLoginHash,
  packEncodedHash,
  guiServerInfoFromHash,
  loginInfoFromHash,
  notificationInfoFromHash,
  sysTopologyInfoFromHash,
} from "./karabo_hash/protocol_hashes";

import { AccessLevel } from "./karabo_data/AccessLevel";
import { GuiServerInfo } from "./karabo_data/GuiServerInfo";

import { Websocket, WebsocketBuilder } from "websocket-ts";

import BinaryEncoder from "./karabo_hash/bin_writer";

import { Hash } from "./karabo_hash/types";

import { store } from "./store";
import { setTopology } from "./store/slices/sysTopologySlice";
import { GuiSessionData, GuiSessionStore } from "./store/GuiSessionStore";
import AuthServerClient from "./http_clients/AuthServerClient";

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
  startHandler: (
    accessLevel: AccessLevel,
    host: string,
    port: number,
    userId: string,
    topic: string,
    serverVersion: string
  ) => void;
  startErrorHandler: (errMsg: string) => void;
}

export class GuiServerConnector {
  //
  // Singleton support
  //
  private constructor() {}

  static #_wsProxyURL: string;
  static #_inst?: GuiServerConnector;
  static get inst(): GuiServerConnector {
    if (!GuiServerConnector.#_inst) {
      GuiServerConnector.#_wsProxyURL =
        store.getState().appSettings.ws_proxy_url;
      GuiServerConnector.#_inst = new GuiServerConnector();
    }
    return GuiServerConnector.#_inst;
  }

  #_session?: GuiServerSession;

  //
  // The websocket event handlers to be used by a GUI Server session.
  //

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
      this.#_session?.startErrorHandler(ev.data);
      ws.close();
      this.#_session = undefined;
    } else {
      blobToHash(ev.data).then((hash: Hash) => {
        const protocolType = hashProtocolType(hash);
        if (
          protocolType === "brokerInformation" ||
          protocolType === "serverInformation"
        ) {
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
              "GUI_PROTOCOL_VIEWER",
              "2.20.0", // Must be >= 2.20.0 - the version required by the GUI Server for auth logins.
              this.#_session?.oneTimeToken,
              undefined
            );
          } else {
            loginHash = buildLoginHash(
              "GUI_PROTOCOL_VIEWER",
              "2.20.0", // Must be >= 2.20.0 - the version required by the GUI Server for auth logins.
              undefined,
              this.#_session?.userId
            );
          }
          const loginMsg = new BinaryEncoder(loginHash).encode();
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
        } else if (protocolType === "loginInformation") {
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
        } else if (protocolType === "notification") {
          if (!this.#_session?.userLogged) {
            // a "notification" message before the user is logged is interpreted
            // as a login error.
            const notificationHash = notificationInfoFromHash(hash);
            this.#_session?.startErrorHandler(notificationHash.message);
          }
        } else if (protocolType === "systemTopology") {
          // Initial topology received - update the topology slice of the Redux Store.
          const sysTopologyInfo = sysTopologyInfoFromHash(hash);
          store.dispatch(setTopology(sysTopologyInfo));
        }

        // TODO: register the message received in the messages slice of the Redux Store.
      });
    }
  };

  /**
   * Handler for errors in the connection with the WebSocketProxy.
   *
   * @param ws the websocket client for which the error ocurred.
   * @param ev the error event (not used).
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  #_onWsError = (ws: Websocket, _ev: Event): any => {
    if (!ws.underlyingWebsocket) {
      this.#_session?.startErrorHandler(
        "Websocket client initialization error"
      );
    } else {
      if (ws.underlyingWebsocket?.CLOSED) {
        // Connection could not be established or couldn't be opened.
        this.#_session?.startErrorHandler("No connection to websocket server");
      } else if (ws.underlyingWebsocket?.CLOSING) {
        this.#_session?.startErrorHandler("Websocket connection being closed.");
      } else {
        this.#_session?.startErrorHandler(
          `Server ${ws.underlyingWebsocket?.url} not available`
        );
        ws.close();
      }
    }
    this.#_session = undefined;
  };

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
    this.#_session = {
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
      startHandler: onStartedHandler,
      startErrorHandler: onErrorHandler,
    };
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
    this.#_session = {
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
      startHandler: onStartedHandler,
      startErrorHandler: onErrorHandler,
    };
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
      if (sessionData && sessionData.refreshToken == undefined) {
        // There is a non-authenticated GUI session to be resumed
        this.#_session = {
          host: sessionData.host,
          port: sessionData.port,
          ws: new WebsocketBuilder(GuiServerConnector.#_wsProxyURL)
            .onOpen(this.#_onWsOpen)
            .onMessage(this.#_onWsMessage)
            .onError(this.#_onWsError)
            .build(),
          isAuthSession: false,
          userLogged: false,
          userId: sessionData.userId,
          accessLevel: sessionData.accessLevel,
          startHandler: onResumedHandler,
          startErrorHandler: onErrorHandler,
        };
      } else if (sessionData) {
        // There is an authenticated GUI session to be resumed
        // Obtain a onetime token from the refresh token
        const res = await authServerCli.refreshTokens(
          sessionData.refreshToken!,
          sessionData.userId
        );
        if (!res.success) {
          // As the session data does not allow successful resume, delete it
          GuiSessionStore.inst.deleteGuiSession();
          onErrorHandler(res.error_msg!);
          return;
        }
        this.#_session = {
          host: sessionData.host,
          port: sessionData.port,
          userId: sessionData.userId,
          ws: new WebsocketBuilder(GuiServerConnector.#_wsProxyURL)
            .onOpen(this.#_onWsOpen)
            .onMessage(this.#_onWsMessage)
            .onError(this.#_onWsError)
            .build(),
          isAuthSession: true,
          userLogged: false,
          oneTimeToken: res.once_token,
          refreshToken: res.refresh_token,
          startHandler: onResumedHandler,
          startErrorHandler: onErrorHandler,
        };
        // Update the stored session data with the new refresh token
        await GuiSessionStore.inst.saveAuthGuiSession(
          sessionData.host,
          sessionData.port,
          sessionData.userId,
          res.refresh_token!
        );
      } else {
        // There's no session to resume
        onNoSessionHandler();
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      // As the session data does not allow successful resume, delete it
      GuiSessionStore.inst.deleteGuiSession();
      onErrorHandler(error.toString());
      return;
    }
  }

  finishSession(): void {
    this.#_session?.ws.close();
    this.#_session = undefined;
    GuiSessionStore.inst.deleteGuiSession();
  }
}
