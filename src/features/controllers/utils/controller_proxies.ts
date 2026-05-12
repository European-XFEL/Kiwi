import type { DeviceProxy } from '@/lib/binding/DeviceProxy';
import { PropertyProxy } from '@/lib/binding/PropertyProxy';
import { PropertyStatus, ProxyStatus } from '@/lib/binding/ProxyStatus';
import { splitKaraboKeys } from '@/lib/binding/utils/splitKaraboKeys';
import { getTopology } from '@/lib/singletons/api';

// Key Validation
// ---
// Validates key shape only (not schema/property existence).
// Invalid slots stay null so indices always align with the original keys array.
// keys[0] is always the root proxy slot regardless of its validity.

export type ValidKey = {
  raw: string;
  deviceId: string;
  propertyPath: string;
};

export type KeyTarget = ValidKey | null;

export const validateKey = (key: unknown): KeyTarget => {
  if (typeof key !== 'string') return null;

  const trimmed = key.trim();
  if (!trimmed.includes('.')) return null;

  const { deviceId, propertyPath } = splitKaraboKeys(trimmed);
  if (!deviceId || !propertyPath) return null;

  return { raw: trimmed, deviceId, propertyPath };
};

export const validateKeys = (keys: unknown): KeyTarget[] =>
  Array.isArray(keys) ? keys.map(validateKey) : [];

// Proxy Creation
// ---
// Equivalent to Python Karabo's get_proxy(deviceId, path).
// Each valid key slot gets a PropertyProxy; invalid slots stay null.
// Index alignment with the original keys array is preserved throughout.

export type PropertyProxyEntries = Array<PropertyProxy | null>;

const createPropertyProxy = (target: ValidKey): PropertyProxy => {
  const deviceProxy = getTopology().getDevice(target.deviceId);
  return new PropertyProxy(deviceProxy, target.propertyPath);
};

export const createPropertyProxies = (
  targets: KeyTarget[]
): PropertyProxyEntries =>
  targets.map((target) => (target ? createPropertyProxy(target) : null));

// Device Monitoring
// ---
// Starts monitoring for every valid property proxy entry.
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
  entries: PropertyProxyEntries,
  owner: object,
  onDeviceUpdate: DeviceUpdateCallback,
  onProxyUpdate: ProxyUpdateCallback
): Cleanup => {
  const cleanups: Cleanup[] = [];
  const monitoredDeviceIds = new Set<string>();

  entries.forEach((propertyProxy, index) => {
    if (!propertyProxy) return;

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

    cleanups.push(deviceProxy.addMonitor());

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
// entries array.

export const disposePropertyProxies = (entries: PropertyProxyEntries): void => {
  entries.forEach((propertyProxy) => propertyProxy?.dispose());
};

// PropertyProxyContext
// ---
// A snapshot of one property proxy and the live state of the device it belongs to.
// Each proxy carries its own device state and status so that per-proxy editability
// rules can be evaluated against the correct device.
// The root property proxy context is what the overlay reads; secondary contexts are
// available for widget-level enabled/disabled logic.

export type PropertyProxyContext = {
  proxy: PropertyProxy | undefined;
  deviceProxy: DeviceProxy | undefined;
  deviceId: string | undefined;
  propertyPath: string | undefined;
  propertyStatus: PropertyStatus;
  deviceState: string | undefined;
  deviceStatus: ProxyStatus;
};

export const EMPTY_PROXY_CONTEXT: PropertyProxyContext = {
  proxy: undefined,
  deviceProxy: undefined,
  deviceId: undefined,
  propertyPath: undefined,
  propertyStatus: PropertyStatus.MISSING,
  deviceState: undefined,
  deviceStatus: ProxyStatus.OFFLINE,
};

export const createEmptyProxyContext = (
  target: KeyTarget
): PropertyProxyContext => {
  if (!target) return EMPTY_PROXY_CONTEXT;

  return {
    ...EMPTY_PROXY_CONTEXT,
    deviceId: target.deviceId,
    propertyPath: target.propertyPath,
  };
};

export const createPropertyProxyContext = (
  propertyProxy: PropertyProxy
): PropertyProxyContext => ({
  proxy: propertyProxy,
  deviceProxy: propertyProxy.root,
  deviceId: propertyProxy.root.deviceId,
  propertyPath: propertyProxy.path,
  propertyStatus: propertyProxy.binding
    ? PropertyStatus.NONE
    : PropertyStatus.MISSING,
  deviceState: propertyProxy.root.state,
  deviceStatus: propertyProxy.root.status,
});

export const createPropertyProxyContexts = (
  entries: PropertyProxyEntries,
  targets: KeyTarget[]
): PropertyProxyContext[] =>
  entries.map((propertyProxy, index) =>
    propertyProxy
      ? createPropertyProxyContext(propertyProxy)
      : createEmptyProxyContext(targets[index] ?? null)
  );

export const createEmptyProxyContexts = (
  targets: KeyTarget[]
): PropertyProxyContext[] => targets.map(createEmptyProxyContext);
