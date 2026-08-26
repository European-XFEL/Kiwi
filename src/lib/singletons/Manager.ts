import { broadcast_event, KaraboEvent } from '@/lib/events';
import { AccessControlManager } from '@/features/user/utils/AccessLevel';
import { decodeBinary, Hash, Schema } from '@/karabo/data/api';
import { getConfig, getNetwork, getTopology } from '@/lib/singletons/api';

import { v4 as uuidv4 } from 'uuid';
import { get_reason_parts } from './util';
import { showMessageBox } from '../messagebox';

export interface RequestHandler {
  (success: boolean, reply: any): void;
  (success: boolean, reply: any, request: any): void;
}

export class Manager {
  private _network: any;
  private _topology: any;

  private _hashHandlers = new Map<string, (hash: Hash) => void>();
  private _requestHandlers = new Map<string, RequestHandler>();

  public constructor() {
    this._network = getNetwork();
    this._topology = getTopology();
    // Bind 'this' context so dynamic calls inside processMessage work correctly
    this._network.onReceivedData = this.processMessage.bind(this);
  }

  /**
   * Dynamically dispatches the incoming hash to a matching handler method.
   */
  public processMessage(binHash: ArrayBuffer) {
    if (!binHash) {
      console.log('Received an empty bin hash');
      return;
    }
    // Remove the length of Hash. Create a view from byte 4, no copy
    const bins = new Uint8Array(binHash, 4, binHash.byteLength - 4);
    const hash = decodeBinary(bins);
    const protocolType = (hash.getValue('type') as string) ?? '';

    // Construct the expected method name
    const handlerName = `handle_${protocolType}`;

    // Access method dynamically.
    const handler = (this as any)[handlerName];

    if (typeof handler === 'function') {
      // Invoke the handler, ensuring 'this' context is preserved
      handler.call(this, hash);
    } else {
      // Fallback for custom/dynamic registered handlers or warnings
      if (this._hashHandlers.has(protocolType)) {
        this._hashHandlers.get(protocolType)!(hash);
      } else {
        console.warn(
          `Received hash with unknown type "${protocolType}". No method "${handlerName}" found.`
        );
      }
    }
  }

  // #region Protocol Handlers (Naming Convention: handle_<type>)

  private handle_brokerInformation(hash: Hash): void {
    const topic = hash.getValue('topic') as string;
    const version = hash.getValue('version') as string;

    this._network.updateSessionServerInfo(topic, version);
    this._network.performLogin();

    const session = this._network.session;
    if (session && !session.isAuthSession) {
      getConfig().saveNonAuthSession(session.userId!, session.accessLevel!);

      AccessControlManager.instance.initFromLogin({
        accessLevel: session.accessLevel!,
        isAuthenticated: false,
        userId: session.userId!,
      });

      this._network.updateSessionAuth(session.accessLevel!);
      this._network.completeSessionStart(session.accessLevel!);
    }
  }

  public callDeviceSlot(
    handler: RequestHandler,
    instanceId: string,
    slotName: string,
    params: Hash
  ): string {
    const token = uuidv4();
    console.assert(!this._requestHandlers.has(token), 'token already exists');

    if (typeof handler !== 'function') {
      throw new Error('handler must be callable');
    }

    this._requestHandlers.set(token, handler);
    // Call the GUI server
    getNetwork().onExecuteGeneric(instanceId, slotName, params, token);
    return token;
  }

  public handle_requestGeneric(response: Hash): void {
    /**
     * Handle the requestGeneric reply from the GUI server.
     *
     * Generic requests are supposed to have a `token` in the input arguments.
     * Unfolding the `token` should provide a request handler.
     */
    const success = response.getValue('success');
    const reply = response.get('reply');
    const reason = response.get('reason');
    const request = response.get('request');

    const token = request.getValue('token');
    const handler = this._requestHandlers.get(token);
    if (!handler) {
      return;
    }
    this._requestHandlers.delete(token);

    const actualReply = success === true ? reply : reason;

    try {
      if (handler.length === 2) {
        handler(success, actualReply);
      } else {
        handler(success, actualReply, request);
      }
    } catch (ex) {
      console.error(
        `Exception caught in callback handler "${String(handler)}" with reply:\n${String(actualReply)}`,
        ex
      );
    }
  }
  // Alias for deprecated 'serverInformation' to use the same logic
  public handle_serverInformation(hash: Hash): void {
    this.handle_brokerInformation(hash);
  }

  public handle_loginInformation(hash: Hash): void {
    const session = this._network.session;

    if (!session) return;
    if (!session.isAuthSession) return;

    const accessLevel = hash.getValue('accessLevel') as number;

    getConfig().saveAuthSession(session.userId!, session.refreshToken!);

    AccessControlManager.instance.initFromLogin({
      accessLevel: accessLevel,
      isAuthenticated: true,
      userId: session.userId!,
    });

    this._network.updateSessionAuth(accessLevel);
    this._network.completeSessionStart(accessLevel);
  }

  public handle_notification(hash: Hash): void {
    // A notification in the GUI Client is handled globally independently of a user session
    // being active or not - it always triggers a modeless dialog that displays the message.
    // Similarly, Kiwi will always display a toaster with the message, independently of being
    // in logged in or in logged out state (even on top of an unrecoverable error)
    broadcast_event(KaraboEvent.Notification, hash);
  }

  public handle_onSessionExpired(_: Hash): void {
    const session = this._network.session;
    if (session && !session.isAuthSession) {
      console.warn(
        'Session expiration messages should only be sent Authenticated GUI Servers!'
      );
      console.warn(
        `Check the configuration of the server ${session.host}:${session.port}`
      );
      return;
    }
    // After sending the end of session notification, the GUI Server
    // waits at least 1 second and terminates the connection. We finish
    // the connection from Kiwi's side before that to avoid Kiwi
    // interpreting the terminated connection as a connection loss.
    this._network.expireSession(session.host, session.port);
  }

  public handle_onEndSessionNotice(hash: Hash): void {
    const session = this._network.session;
    if (session && !session.isAuthSession) {
      console.warn(
        'Session expiration should only happen for Authenticated GUI Servers!'
      );
      console.warn(
        `Check the configuration of the server ${session.host}:${session.port}`
      );
      return;
    }
    broadcast_event(KaraboEvent.SessionExpirationNotified, hash);
  }

  public handle_systemTopology(hash: Hash): void {
    this._topology.initialize(hash.get('systemTopology'));
  }

  public handle_topologyUpdate(hash: Hash): void {
    this._topology.updateTopology(hash);
  }

  public handle_projectListDomains(hash: Hash): void {
    broadcast_event(KaraboEvent.ListDomains, hash);
  }

  public handle_projectListItems(hash: Hash): void {
    broadcast_event(KaraboEvent.ListItems, hash);
  }

  public handle_projectLoadItems(hash: Hash): void {
    broadcast_event(KaraboEvent.LoadProjectItems, hash);
  }

  public handle_projectUpdated(hash: Hash): void {
    // No need to check if the clientId of the client that triggered the
    // update matches the Kiwi instance - Kiwi never saves projects.
    broadcast_event(KaraboEvent.ProjectUpdated, hash.getValue('info.uuids'));
  }

  public handle_deviceConfigurations(hash: Hash): void {
    const configurations = hash.getValue('configurations') as Hash;
    for (const [deviceId, properties] of configurations.items()) {
      this._topology.handleDeviceConfiguration(deviceId, properties);
    }
  }

  public handle_deviceSchema(hash: Hash): void {
    const deviceId = hash.getValue('deviceId') as string;
    const deviceSchema = hash.getValue('schema') as Schema;
    this._topology.handleDeviceSchema(deviceId, deviceSchema);
  }

  public handle_executeReply(hash: Hash): void {
    const success = hash.getValue<boolean>('success');
    if (!success) {
      const reason = hash.getValue('reason');

      const [msg, details] = get_reason_parts(reason);
      const input_info = hash.getValue<Hash>('input');
      const deviceId = input_info.getValue<string>('deviceId');
      const command = input_info.getValue<string>('command');
      const title = `Execute slot ${command} of device ${deviceId} failed.`;
      showMessageBox({
        variant: 'error',
        title,
        msg: msg,
        details,
      });
    }
  }

  public handle_networkData(hash: Hash): void {
    const name = hash.getValue<string>('name');
    const data = hash.getValue<Hash>('data');
    const meta = hash.getValue<Hash>('meta');
    this._topology.handleNetworkData(name, data, meta);
  }

  // #endregion
}
