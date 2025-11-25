import { create } from "zustand";
import { TopologyEventType } from "@/karabo_data/TopologyInfo";
import { DeviceStatus, DeviceProxy } from "@/overlay_indicator/types";
import { DeviceOverlayIndicator } from "@/overlay_indicator/device_overlay_indicator";

export interface DeviceStatusStore {
  devices: Map<string, DeviceStatus>;

  // Topology:
  applyTopologyEvent: (deviceId: string, eventType: TopologyEventType) => void;

  // Schema:
  markSchemaRequested: (deviceId: string) => void;
  markSchemaReceived: (deviceId: string) => void;

  // Config / monitoring:
  markConfigReceived: (deviceId: string) => void;

  // selector:
  getDevice: (deviceId: string) => DeviceStatus | undefined;
}

export const useDeviceStatusStore = create<DeviceStatusStore>((set, get) => {
  // base state
  const createBaseStatus = (deviceId: string): DeviceStatus => ({
    device_id: deviceId,
    topology_status: { is_device_online: false },
    schema_status: {
      requested_device_schema: false,
      received_device_schema: false,
    },
    config_status: { has_config: false },
    overlay_status: DeviceProxy.OFFLINE,
  });

  // helper to update + recompute overlay_status
  const updateDevice = (
    deviceId: string,
    updater: (prev: DeviceStatus) => DeviceStatus
  ) => {
    set((state) => {
      const devices = new Map(state.devices);
      const prev = devices.get(deviceId) ?? createBaseStatus(deviceId);

      const next = updater(prev);
      next.overlay_status =
        DeviceOverlayIndicator.compute_device_overlay_status(next);

      devices.set(deviceId, next);

      // optional: debug
      // console.log("[DeviceStatusStore] update", deviceId, next.overlay_status);

      return { ...state, devices };
    });
  };

  return {
    devices: new Map<string, DeviceStatus>(),

    applyTopologyEvent: (deviceId, eventType) => {
      const isOnline =
        eventType === TopologyEventType.NEW ||
        eventType === TopologyEventType.UPDATE;
      const now = Date.now();

      updateDevice(deviceId, (prev) => ({
        ...prev,
        topology_status: {
          ...prev.topology_status,
          is_device_online: isOnline,
          last_event_type: eventType,
          last_change_at: now,
        },
      }));
    },

    markSchemaRequested: (deviceId) => {
      const now = Date.now();
      updateDevice(deviceId, (prev) => ({
        ...prev,
        schema_status: {
          ...prev.schema_status,
          requested_device_schema: true,
          last_changed_at: now,
        },
      }));
    },

    markSchemaReceived: (deviceId) => {
      const now = Date.now();
      updateDevice(deviceId, (prev) => ({
        ...prev,
        schema_status: {
          ...prev.schema_status,
          requested_device_schema: true,
          received_device_schema: true,
          last_changed_at: now,
        },
      }));
    },

    markConfigReceived: (deviceId) => {
      const now = Date.now();
      updateDevice(deviceId, (prev) => ({
        ...prev,
        config_status: {
          ...prev.config_status,
          has_config: true,
          last_change_at: now,
        },
      }));
    },

    getDevice: (deviceId) => get().devices.get(deviceId),
  };
});

// ============================================================================
// HOOKS - For components to consume device state
// ============================================================================

export function useDeviceStatus(deviceId: string) {
  return useDeviceStatusStore((state) => state.devices.get(deviceId));
}

export function useDeviceProxyHook(deviceId: string): DeviceProxy | undefined {
  return useDeviceStatusStore(
    (state) => state.devices.get(deviceId)?.overlay_status
  );
}

export function useDeviceOnline(deviceId: string): boolean {
  return (
    useDeviceStatusStore(
      (state) => state.devices.get(deviceId)?.topology_status.is_device_online
    ) ?? false
  );
}
