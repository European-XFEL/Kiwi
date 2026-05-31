import { Hash, Schema, Timestamp } from '@/karabo/data/api';
import { applyConfiguration, DeviceProxy } from '@/lib/binding/api';

export class SystemTopology {
  public _system_hash: Hash | null = null;
  private devices = new Map<string, DeviceProxy>();

  public constructor() {}

  public initialize(systemTopology: Hash) {
    console.log('Received SystemTopology ...');
    this._system_hash = systemTopology;
    this._ensureTopologyKeys();
  }

  public get initialized(): boolean {
    return this._system_hash != null;
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

  public updateTopology(hash: Hash) {
    const changes = hash.getValue('changes') as Hash;
    const gone = changes.getValue('gone') as Hash;

    // first evaluate the gone
    if (!gone.empty()) {
      for (const item of ['device', 'macro'] as const) {
        if (!gone.has(item)) continue;

        const gone_instances = gone.getValue(item) as Hash;
        for (const [deviceId, , ,] of gone_instances.iterall()) {
          this.setOnlineFlag(deviceId, false);
          this._system_hash?.erase(`${item}.${deviceId}`);
        }
      }

      if (gone.has('server')) {
        for (const [deviceId, , ,] of gone.getValue('server').iterall()) {
          this._system_hash?.erase(`${'server'}.${deviceId}`);
        }
      }
    } // gone end

    const neew = changes.getValue('new') as Hash;
    if (!neew.empty()) {
      // merge the hash
      this._system_hash?.merge(neew);

      for (const item of ['device', 'macro'] as const) {
        if (!neew.has(item)) continue;

        const new_instances = neew.getValue(item) as Hash;
        for (const [deviceId, , ,] of new_instances.iterall()) {
          // Update proxy (device became visible in topology)
          this.setOnlineFlag(deviceId, true);
        }
      }
    } // new end

    // merge update as last step
    const update = changes.getValue('update') as Hash;
    if (!update.empty()) {
      this._system_hash?.merge(update);
    }
  }

  public getDevice(deviceId: string): DeviceProxy {
    let proxy = this.devices.get(deviceId);
    if (!proxy) {
      proxy = DeviceProxy.createDeviceProxy(deviceId);
      this.devices.set(deviceId, proxy);
      if (this.isDeviceOnline(deviceId)) {
        proxy.setOnlineFlag(true);
      }
    }
    return proxy;
  }

  public setOnlineFlag(deviceId: string, isOnline: boolean): void {
    let proxy = this.devices.get(deviceId);
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
      return;
    }
    const timestamp = Timestamp.fromHashAttributes(
      meta.getAttributes('timestamp')
    );
    applyConfiguration(data, binding!.value.get('schema'), timestamp);
    proxy.requestNetwork(prop_path);
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
