import { create } from "zustand";
import { TopologyEventType } from "@/karabo_data/TopologyInfo";
import { ProxyStatus } from "@/device_proxy/enum";
import { DeviceProxy } from "@/device_proxy/DeviceProxy";

// ─────────────────────────────────────────────────────────────
// STORE INTERFACE
// ─────────────────────────────────────────────────────────────

export interface DeviceProxyStore {
  devices: Map<string, DeviceProxy>;
  /** bump this anytime any proxy changes → triggers React re-renders */
  version: number;

  getProxy: (deviceId: string) => DeviceProxy;

  // Store-level methods (take deviceId, get proxy, call proxy methods)
  applyDeviceTopologyEvent: (
    deviceId: string,
    eventType: TopologyEventType
  ) => void;
  markDeviceSchemaRequested: (deviceId: string) => void;
  markDeviceSchemaReceived: (deviceId: string) => void;
  markDeviceConfigReceived: (deviceId: string) => void;
  beginMonitoringDeviceProperties: (deviceId: string) => void;
  endMonitoringDeviceProperties: (deviceId: string) => void;

  getProxyStatus: (deviceId: string) => ProxyStatus | undefined;
  isDeviceOnline: (deviceId: string) => boolean;
}

// ─────────────────────────────────────────────────────────────
// STORE IMPLEMENTATION
// ─────────────────────────────────────────────────────────────

export const useDeviceProxyStore = create<DeviceProxyStore>((set, get) => {
  const bumpVersion = () =>
    set((state) => ({ ...state, version: state.version + 1 }));

  return {
    devices: new Map<string, DeviceProxy>(),
    version: 0,

    getProxy: (deviceId) => {
      let proxy = get().devices.get(deviceId);

      if (!proxy) {
        proxy = new DeviceProxy(deviceId);

        // Subscribe to proxy events → bump store version so hooks re-render
        proxy.on("status_changed", () => {
          bumpVersion();
        });
        proxy.on("topology_changed", () => {
          bumpVersion();
        });
        proxy.on("schema_changed", () => {
          bumpVersion();
        });
        proxy.on("config_changed", () => {
          bumpVersion();
        });

        set((state) => {
          const devices = new Map(state.devices);
          devices.set(deviceId, proxy!);
          return { ...state, devices };
        });
      }

      return proxy;
    },

    applyDeviceTopologyEvent: (deviceId, eventType) => {
      const proxy = get().getProxy(deviceId);
      const isOnline =
        eventType === TopologyEventType.NEW ||
        eventType === TopologyEventType.UPDATE;

      proxy.updateTopology({ is_device_online: isOnline });
      // no need to bump here – proxy will emit "topology_changed"
    },

    markDeviceSchemaRequested: (deviceId) => {
      const proxy = get().getProxy(deviceId);
      proxy.markSchemaRequested();
      // emits "schema_changed" → bump via listener
    },

    markDeviceSchemaReceived: (deviceId) => {
      const proxy = get().getProxy(deviceId);
      proxy.markSchemaReceived();
      // emits "schema_changed" → bump via listener
    },

    markDeviceConfigReceived: (deviceId) => {
      const proxy = get().getProxy(deviceId);
      proxy.markConfigReceived();
      // emits "config_changed" → bump via listener
    },

    // NEW:
    beginMonitoringDeviceProperties: (deviceId) => {
      const proxy = get().getProxy(deviceId);
      proxy.registerProperty();
    },

    endMonitoringDeviceProperties: (deviceId) => {
      const proxy = get().getProxy(deviceId);
      proxy.unregisterProperty();
    },

    getProxyStatus: (deviceId) => {
      const proxy = get().devices.get(deviceId);
      return proxy?.status;
    },

    isDeviceOnline: (deviceId) => {
      const proxy = get().devices.get(deviceId);
      return proxy?.isOnline ?? false;
    },
  };
});

// ─────────────────────────────────────────────────────────────
// REACT HOOKS (UI ENTRY POINT)
// ─────────────────────────────────────────────────────────────

/**
 * Get DeviceProxy instance for a device.
 * This is the PRIMARY hook – use it when you need full proxy access.
 */
export function useDeviceProxy(deviceId: string): DeviceProxy {
  // Ensure proxy exists
  const getProxy = useDeviceProxyStore((state) => state.getProxy);
  const proxy = getProxy(deviceId);

  // Subscribe to version → re-render when any proxy event fires
  useDeviceProxyStore((state) => state.version);

  return proxy;
}

/**
 * Get ProxyStatus for a device.
 */
export function useProxyStatus(deviceId: string): ProxyStatus | undefined {
  const proxy = useDeviceProxy(deviceId);
  return proxy?.status;
}

/**
 * Check if device is online (topology-wise).
 */
export function useDeviceOnline(deviceId: string): boolean {
  const proxy = useDeviceProxy(deviceId);
  return proxy?.isOnline ?? false;
}

/**
 * Check if device has schema.
 */
export function useDeviceHasSchema(deviceId: string): boolean {
  const proxy = useDeviceProxy(deviceId);
  return proxy?.hasSchema ?? false;
}

/**
 * Check if device has config.
 */
export function useDeviceHasConfig(deviceId: string): boolean {
  const proxy = useDeviceProxy(deviceId);
  return proxy?.hasConfig ?? false;
}
