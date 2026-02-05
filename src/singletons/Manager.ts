import {
  guiServerInfoFromHash,
  loginInfoFromHash,
  notificationInfoFromHash,
} from '@/karabo_hash/decoders/gui_session';
import { broadcast_event, KaraboEvent } from '@/events';
import { unpackEncodedHash } from '@/karabo_hash/hash_utils';
import { decodeBinary } from '@/karabo-hash/bin_reader';
import { AccessControlManager } from '@/features/user/utils/AccessLevel';
import { getTopology, getNetwork, getConfig } from '@/singletons/api';
import { Hash, Schema } from '@/karabo-hash/hash';
import { devicesConfigsFromHash } from '@/karabo_hash/decoders/device_config';
import { deviceSchemaFromHash } from '@/karabo_hash/decoders/device_schema';

export class Manager {
  private _network: any;
  private _topology: any;

  private _hashHandlers = new Map<string, (hash: Hash) => void>();

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
    const hash = decodeBinary(unpackEncodedHash(binHash));
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
    const serverInfo = guiServerInfoFromHash(hash);

    this._network.updateSessionServerInfo(serverInfo.topic, serverInfo.version);
    this._network.performLogin();

    // Check for Non-Auth session logic
    const session = this._network.session;
    if (session && !session.isAuthSession) {
      getConfig().saveNonAuthSession(
        session.host,
        session.port,
        session.userId!,
        session.accessLevel!
      );

      AccessControlManager.instance.initFromLogin({
        accessLevel: session.accessLevel!,
        isAuthenticated: false,
        userId: session.userId!,
      });

      this._network.updateSessionAuth(session.accessLevel!);

      session.startHandler(
        session.accessLevel!,
        session.host,
        session.port,
        session.userId!,
        session.topic!,
        session.serverVersion!
      );
    }
  }

  // Alias for deprecated 'serverInformation' to use the same logic
  private handle_serverInformation(hash: Hash): void {
    this.handle_brokerInformation(hash);
  }

  private handle_loginInformation(hash: Hash): void {
    const loginInfoHash = loginInfoFromHash(hash);
    const session = this._network.session;

    if (!session) return;

    getConfig().saveAuthSession(
      session.host,
      session.port,
      session.userId!,
      session.refreshToken!
    );

    AccessControlManager.instance.initFromLogin({
      accessLevel: loginInfoHash.accessLevel,
      isAuthenticated: true,
      userId: session.userId!,
    });

    this._network.updateSessionAuth(loginInfoHash.accessLevel);

    session.startHandler(
      loginInfoHash.accessLevel,
      session.host,
      session.port,
      session.userId!,
      session.topic!,
      session.serverVersion!
    );
  }

  private handle_notification(hash: Hash): void {
    const session = this._network.session;
    // If a notification arrives before user is logged, it is interpreted as a login error.
    if (session && !session.userLogged) {
      const notificationHash = notificationInfoFromHash(hash);
      session.startErrorHandler(notificationHash.message);
    }
  }

  private handle_systemTopology(hash: Hash): void {
    this._topology.initialize(hash.get('systemTopology'));
  }

  private handle_topologyUpdate(hash: Hash): void {
    this._topology.updateTopology(hash);
  }

  private handle_projectListDomains(hash: Hash): void {
    broadcast_event(KaraboEvent.ListDomains, { data: hash });
  }

  private handle_projectListItems(hash: Hash): void {
    broadcast_event(KaraboEvent.ListItems, { data: hash });
  }

  public handle_deviceConfigurations(hash: Hash): void {
    const configurations = hash.getValue('configurations') as Hash;
    const deviceConfigInfos = devicesConfigsFromHash(configurations);
    for (const { deviceId, properties } of deviceConfigInfos) {
      this._topology.handleDeviceConfiguration(deviceId, properties);
    }
  }

  public handle_deviceSchema(hash: Hash): void {
    const deviceId = hash.getValue('deviceId') as string;
    const deviceSchema = hash.getValue('schema') as Schema;
    const deviceSchemaInfo = deviceSchemaFromHash(deviceSchema);
    this._topology.handleDeviceSchema(deviceId, deviceSchemaInfo);
  }

  // #endregion

  public registerHashHandler(
    hashType: string,
    handler: (hash: Hash) => void
  ): void {
    if (this._hashHandlers.has(hashType)) {
      throw new Error(`Hash handler for type ${hashType} already registered`);
    }
    this._hashHandlers.set(hashType, handler);
  }

  public unregisterHashHandler(hashType: string): void {
    this._hashHandlers.delete(hashType);
  }

  // #endregion
}
