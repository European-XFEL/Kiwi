import type { BaseBinding } from '@/lib/binding/BaseBinding';
import { PropertyProxy } from '@/lib/binding/PropertyProxy';
import { ProxyStatus } from '@/lib/binding/ProxyStatus';
import { splitKaraboKeys } from '@/lib/binding/utils/splitKaraboKeys';
import { getTopology } from '@/lib/singletons/api';

// Proxy Creation
// ---
// Scene keys are assumed to be ordered and parseable as `deviceId.propertyPath`.
// Runtime state such as offline devices or missing bindings stays on the proxy.

export type PropertyProxies = PropertyProxy[];

const createPropertyProxy = (key: string): PropertyProxy => {
  const { deviceId, propertyPath } = splitKaraboKeys(key);
  const deviceProxy = getTopology().getDevice(deviceId);
  return new PropertyProxy(deviceProxy, propertyPath);
};

export const createPropertyProxies = (keys: string[]): PropertyProxies =>
  keys.map(createPropertyProxy);

// Device Monitoring
// ---
// Starts monitoring for every property proxy.
// DeviceProxy.addMonitor() is reference-counted, matching Karabo's
// PropertyProxy.start_monitoring() behavior: two properties on the same device
// increment the monitor count twice and clean up twice.
//
// State/status subscriptions are deduplicated per device. One subscription per
// unique device is enough to resnapshot all property contexts that belong to it.
//
// PropertyProxy value/binding subscriptions are per entry, not deduplicated,
// because each property has its own live value and schema binding.
//
// The owner must be stable, usually ownerRef.current from React. Signal keeps
// only a WeakRef to it, so the caller must keep the owner alive.

type Cleanup = () => void;
type DeviceUpdateCallback = (deviceId: string) => void;
type ProxyUpdateCallback = (index: number, proxy: PropertyProxy) => void;

export const startMonitoring = (
  proxies: PropertyProxies,
  owner: object,
  onDeviceUpdate: DeviceUpdateCallback,
  onProxyUpdate: ProxyUpdateCallback
): Cleanup => {
  const cleanups: Cleanup[] = [];
  const monitoredDeviceIds = new Set<string>();

  proxies.forEach((propertyProxy, index) => {
    const deviceProxy = propertyProxy.root;
    const deviceId = deviceProxy.deviceId;

    // Subscribe to state/status before calling addMonitor() because addMonitor()
    // can synchronously trigger refreshDeviceSchema() -> status transitions that
    // would be missed if the subscriptions were not yet in place.
    // Cleanup is forward (insertion) order so state/status are unsubscribed
    // before stopMonitor fires, preventing the _stopMonitoringDevice
    // status_update from reaching live handlers.
    if (!monitoredDeviceIds.has(deviceId)) {
      monitoredDeviceIds.add(deviceId);

      const syncDevice = () => onDeviceUpdate(deviceId);
      cleanups.push(deviceProxy.state_update.subscribe(owner, syncDevice));
      cleanups.push(deviceProxy.status_update.subscribe(owner, syncDevice));
    }

    cleanups.push(propertyProxy.startMonitoring());

    // Each PropertyProxy tracks its own value and binding updates.
    cleanups.push(
      propertyProxy.value_update((proxy) => onProxyUpdate(index, proxy))
    );
    cleanups.push(
      propertyProxy.binding_update((proxy) => onProxyUpdate(index, proxy))
    );
  });

  // Forward (insertion) order: state_unsub -> status_unsub -> stopMonitor.
  // state/status are unsubscribed before stopMonitor, so the status_update
  // that _stopMonitoringDevice fires on cleanup cannot reach live handlers.
  return () => cleanups.forEach((fn) => fn());
};

// Proxy Disposal
// ---
// PropertyProxy subscribes to root_proxy.schema_update in its constructor,
// so every created proxy must be disposed to release that subscription.
// Paired with createPropertyProxies: call disposePropertyProxies on the same
// proxies array.

export const disposePropertyProxies = (proxies: PropertyProxies): void => {
  proxies.forEach((propertyProxy) => propertyProxy.dispose());
};

// PropertyProxySnapshot
// ---
// A snapshot of one property proxy and the live state of the device it belongs to.
// Each proxy carries its own device state and status so that per-proxy editability
// rules can be evaluated against the correct device.
// The root property proxy context is what the overlay reads; secondary contexts are
// available for widget-level enabled/disabled logic.

export type PropertyProxySnapshot = {
  proxy: PropertyProxy;
  deviceState: string | undefined;
  deviceStatus: ProxyStatus;
  /** Monotonic identity for device state/status snapshot updates; distinct from the Karabo value timestamp below. */
  rootRevision: number;
  binding: BaseBinding | undefined;
  value: any;
  timestamp: any;
};

export const createPropertyProxySnapshot = (
  propertyProxy: PropertyProxy
): PropertyProxySnapshot => ({
  proxy: propertyProxy,
  deviceState: propertyProxy.root.state,
  deviceStatus: propertyProxy.root.status,
  rootRevision: propertyProxy.root.rootRevision,
  binding: propertyProxy.binding,
  value: propertyProxy.value,
  timestamp: propertyProxy.timestamp,
});

export const createPropertyProxySnapshots = (
  proxies: PropertyProxies
): PropertyProxySnapshot[] => proxies.map(createPropertyProxySnapshot);

// Snapshot update helpers
// ---
// Keep snapshot rebuild logic beside createPropertyProxySnapshot so useProxies
// only wires subscriptions and does not know which fields define a device snapshot.

export const updateDeviceProxySnapshots = (
  prevSnapshots: PropertyProxySnapshot[],
  proxies: PropertyProxies,
  deviceId: string
): PropertyProxySnapshot[] | null => {
  let changed = false;
  const next = prevSnapshots.map((snapshot, i) => {
    const proxy = proxies[i];
    if (proxy.root.deviceId != deviceId) return snapshot;
    if (snapshot.rootRevision === proxy.root.rootRevision) return snapshot;
    changed = true;
    return createPropertyProxySnapshot(proxy);
  });
  return changed ? next : null;
};

export const updatePropertyProxySnapshot = (
  prevSnapshots: PropertyProxySnapshot[],
  index: number,
  proxy: PropertyProxy
): PropertyProxySnapshot[] => {
  const next = [...prevSnapshots];
  next[index] = createPropertyProxySnapshot(proxy);
  return next;
};
