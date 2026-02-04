import { TopologyEventType } from '@/karabo_data/TopologyInfo';
import { Hash } from '@/karabo-hash/hash';
import { deviceManager } from '@/lib/binding/DeviceManager';

export type DeviceTopologyHandler = (
  infoType: TopologyEventType,
  instanceId: string
) => void;

export class SystemTopology {
  public _system_hash: Hash | null = null;
  public constructor() {}

  // #region initialize

  public initialize(systemTopology: Hash) {
    // Store the systemHash, clear before?
    this._system_hash = systemTopology;
    // const sysTopologyInfo = sysTopologyInfoFromHash(hash);

    for (const item of ['device', 'macro'] as const) {
      const devices = systemTopology.getValue(item) as Hash;
      for (const [deviceId, ,] of devices.iterall()) {
        // Update proxy (device became visible in topology)
        deviceManager.setOnlineFlag(deviceId, true);

        if (this.deviceMonitors.has(deviceId)) {
          // Sends updates to all known monitors for the device
          for (const updateHandler of this.deviceMonitors.get(deviceId)!) {
            updateHandler(TopologyEventType.NEW, deviceId);
          }
        }
      }
    }
  }

  isDeviceOnline = (deviceId: string): boolean => {
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
          deviceManager.setOnlineFlag(deviceId, false);
          this._system_hash?.erase(`${item}.${deviceId}`);
          if (this.deviceMonitors.has(deviceId)) {
            for (const updateHandler of this.deviceMonitors.get(deviceId)!) {
              updateHandler(TopologyEventType.GONE, deviceId);
            }
          }
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
          deviceManager.setOnlineFlag(deviceId, true);
          if (this.deviceMonitors.has(deviceId)) {
            // Sends updates to all known monitors for the device
            for (const updateHandler of this.deviceMonitors.get(deviceId)!) {
              updateHandler(TopologyEventType.NEW, deviceId);
            }
          }
        }
      }
    } // new end

    // merge update as last step
    const update = changes.getValue('update') as Hash;
    if (!update.empty()) {
      this._system_hash?.merge(update);
    }
  }

  // #endregion

  // #region DeviceInfoMonitors Management

  private deviceMonitors = new Map<string, DeviceTopologyHandler[]>();

  registerDeviceInfoMonitor = (
    deviceId: string,
    deviceInfoUpdateHandler: DeviceTopologyHandler
  ): void => {
    if (!this.deviceMonitors.has(deviceId)) {
      // first monitor for this device
      this.deviceMonitors.set(deviceId, new Array<DeviceTopologyHandler>());
    }
    this.deviceMonitors.get(deviceId)!.push(deviceInfoUpdateHandler);

    // ───────────────────────────────────────────────
    // Seed current state from systemTopology
    // so refresh doesn't start "offline"
    // ───────────────────────────────────────────────
    if (this._system_hash?.get('device').has(deviceId)) {
      deviceManager.setOnlineFlag(deviceId, true);
      deviceInfoUpdateHandler(TopologyEventType.NEW, deviceId);
      return;
    }
    if (this._system_hash?.get('macro').has(deviceId)) {
      deviceManager.setOnlineFlag(deviceId, true);
      deviceInfoUpdateHandler(TopologyEventType.NEW, deviceId);
      return;
    }

    deviceManager.setOnlineFlag(deviceId, false);
    deviceInfoUpdateHandler(TopologyEventType.GONE, deviceId);
  };

  unregisterDeviceInfoMonitor = (
    deviceId: string,
    deviceInfoUpdateHandler: DeviceTopologyHandler
  ): void => {
    const monitors = this.deviceMonitors.get(deviceId);
    if (!monitors) return;

    const idx = monitors.indexOf(deviceInfoUpdateHandler);
    if (idx === -1) return;

    monitors.splice(idx, 1);

    if (monitors.length === 0) {
      this.deviceMonitors.delete(deviceId);
    }
  };
}
