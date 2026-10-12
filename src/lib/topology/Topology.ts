import {
  Hash,
  HashList,
  HashAttributes,
  Schema,
  Timestamp,
} from '@/karabo/data/api';
import {
  applyConfiguration,
  DeviceProxy,
  InstanceStatus,
} from '@/lib/binding/api';

export class SystemTopology {
  public _system_hash: Hash | null = null;
  protected devices = new Map<string, DeviceProxy>();

  public constructor() {}

  public initialize(systemTopology: Hash) {
    console.log('Received SystemTopology ...');
    this._system_hash = systemTopology;
    this._ensureTopologyKeys();
    const devices = systemTopology.getValue<Hash>('device');
    const macros = systemTopology.getValue<Hash>('macro');
    for (const [deviceId, proxy] of this.devices) {
      let attrs: HashAttributes | undefined;
      if (devices.has(deviceId)) {
        attrs = devices.getAttributes(deviceId);
      } else if (macros.has(deviceId)) {
        attrs = macros.getAttributes(deviceId);
      }
      this.updateInstance(
        proxy,
        attrs !== undefined,
        attrs?.findValue('status')
      );
    }
  }

  public get initialized(): boolean {
    return this._system_hash != null;
  }

  public isMacro(deviceId: string): boolean {
    return this._system_hash?.getValue('macro')?.has(deviceId) ?? false;
  }

  public isDeviceOnline = (deviceId: string): boolean => {
    if (this._system_hash?.getValue('device').has(deviceId)) {
      return true;
    }
    if (this._system_hash?.getValue('macro').has(deviceId)) {
      return true;
    }
    return false;
  };

  public getDeviceInstanceInfo = (
    deviceId: string
  ): HashAttributes | undefined => {
    for (const kind of ['device', 'macro']) {
      const instances = this._system_hash?.getValue<Hash>(kind);
      if (instances?.has(deviceId)) {
        return instances.getAttributes(deviceId);
      }
    }
    return undefined;
  };

  public updateTopology(hash: Hash) {
    const systemTopology = this._system_hash;
    if (!systemTopology) {
      return;
    }
    const changes = hash.getValue<Hash>('changes');
    const gone = changes.getValue<Hash>('gone');
    if (!gone.empty()) {
      this.instanceGone(gone, systemTopology);
    }
    const added = changes.getValue<Hash>('new');
    if (!added.empty()) {
      this.instanceNew(added, systemTopology);
    }
    const updated = changes.getValue<Hash>('update');
    if (!updated.empty()) {
      this.instanceUpdated(updated, systemTopology);
    }
  }

  private instanceGone(gone: Hash, systemTopology: Hash): void {
    for (const kind of ['device', 'macro', 'server'] as const) {
      if (!gone.has(kind)) {
        continue;
      }
      const instances = systemTopology.getValue<Hash>(kind);
      for (const instanceId of gone.getValue<Hash>(kind).keys()) {
        instances.erase(instanceId);
        if (kind === 'server') {
          continue;
        }
        const proxy = this.devices.get(instanceId);
        if (proxy) {
          this.updateInstance(proxy, false, undefined);
        }
      }
    }
  }

  private instanceNew(added: Hash, systemTopology: Hash): void {
    systemTopology.merge(added);
    this.updateInstances(added);
  }

  private instanceUpdated(updated: Hash, systemTopology: Hash): void {
    systemTopology.merge(updated);
    this.updateInstances(updated);
  }

  private updateInstances(entries: Hash): void {
    for (const kind of ['device', 'macro'] as const) {
      if (!entries.has(kind)) {
        continue;
      }
      const instances = entries.getValue<Hash>(kind);
      for (const [deviceId, , attrs] of instances.iterallValues()) {
        const proxy = this.devices.get(deviceId);
        if (proxy) {
          const status =
            'status' in attrs ? attrs.status : proxy.instanceStatus;
          this.updateInstance(proxy, true, status);
        }
      }
    }
  }

  public getDevice(deviceId: string): DeviceProxy {
    let proxy = this.devices.get(deviceId);
    if (!proxy) {
      proxy = DeviceProxy.createDeviceProxy(deviceId);
      this.devices.set(deviceId, proxy);
      const attrs = this.getDeviceInstanceInfo(deviceId);
      this.updateInstance(
        proxy,
        attrs !== undefined,
        attrs?.findValue('status')
      );
    }
    return proxy;
  }

  public clear(): void {
    this._system_hash = null;
    for (const proxy of this.devices.values()) {
      this.updateInstance(proxy, false, undefined);
    }
    this.devices.clear();
  }

  private updateInstance(
    proxy: DeviceProxy,
    isOnline: boolean,
    status: unknown
  ): void {
    let instanceStatus = InstanceStatus.UNKNOWN;
    if (status === undefined) {
      instanceStatus = InstanceStatus.NONE;
    } else if (
      status === InstanceStatus.NONE ||
      status === InstanceStatus.OK ||
      status === InstanceStatus.UNKNOWN ||
      status === InstanceStatus.ERROR
    ) {
      instanceStatus = status;
    }
    proxy.setInstanceStatus(instanceStatus);
    if (proxy.isOnline !== isOnline) {
      proxy.setOnlineFlag(isOnline);
    }
  }

  public setOnlineFlag(deviceId: string, isOnline: boolean): void {
    const proxy = this.devices.get(deviceId);
    if (proxy) {
      proxy.setOnlineFlag(isOnline);
    }
  }

  // ---------------------------------------------------------------------------

  public handleDeviceConfiguration(deviceId: string, config: Hash): void {
    const proxy = this.devices.get(deviceId);
    if (!proxy) {
      return;
    }
    proxy.handleDeviceConfiguration(config);
  }

  public handlePropertyHistory(
    deviceId: string,
    property: string,
    data: HashList
  ): void {
    this.devices.get(deviceId)?.handlePropertyHistory(property, data);
  }

  public handleDeviceSchema(deviceId: string, schema: Schema): void {
    const proxy = this.devices.get(deviceId);
    if (!proxy) {
      return;
    }
    proxy.handleDeviceSchema(schema);
  }

  public handleNetworkData(name, data: Hash, meta: Hash): void {
    const [deviceId, prop_path] = name.split(':');
    console.log('Handling network data from', name);

    const proxy = this.devices.get(deviceId);
    if (!proxy) {
      return;
    }
    // get output channel binding
    const binding = proxy.getBinding(prop_path);
    if (!binding) {
      console.log('No binding in network data from', name);
      return;
    }
    const timestamp = Timestamp.fromHashAttributes(
      meta.getAttributes('timestamp')
    );
    applyConfiguration(data, binding!.value.get('schema'), timestamp);
    if (proxy.pipeline_subscriptions.has(prop_path)) {
      proxy.requestNetwork(prop_path);
    }
  }

  private _ensureTopologyKeys(): void {
    if (this._system_hash) {
      for (const key of [
        'device',
        'server',
        'macro',
        'client',
        'unknown',
      ] as const) {
        if (!this._system_hash?.has(key)) {
          this._system_hash.set(key, new Hash());
        }
      }
    }
  }
}
