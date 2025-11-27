import { create } from "zustand";
import type { DeviceSchemaInfo, PropertySchemaAttributes } from "@/karabo_data/DeviceSchemaInfo";

// ─────────────────────────────────────────────────────────────
// STORE INTERFACE
// ─────────────────────────────────────────────────────────────

export interface DeviceSchemaStore {
  /** Map<deviceId, Map<propertyId, PropertySchemaAttributes>> */
  schemas: Map<string, Map<string, PropertySchemaAttributes>>;

  /** Bump this to trigger React re-renders when schema changes */
  version: number;

  // Store methods (called by connectors)
  setDeviceSchema: (deviceId: string, schema: DeviceSchemaInfo) => void;
  removeDeviceSchema: (deviceId: string) => void;

  // Query methods (called by hooks and other stores)
  getPropertySchema: (deviceId: string, propertyId: string) => PropertySchemaAttributes | undefined;
  getDeviceSchema: (deviceId: string) => Map<string, PropertySchemaAttributes> | undefined;
}

// ─────────────────────────────────────────────────────────────
// STORE IMPLEMENTATION
// ─────────────────────────────────────────────────────────────

export const useDeviceSchemaStore = create<DeviceSchemaStore>((set, get) => {
  const bumpVersion = () =>
    set((state) => ({ ...state, version: state.version + 1 }));

  return {
    schemas: new Map<string, Map<string, PropertySchemaAttributes>>(),
    version: 0,

    setDeviceSchema: (deviceId, schema) => {
      const propertyDescriptors = new Map(schema.propertyDescriptors);

      set((state) => {
        const newSchemas = new Map(state.schemas);
        newSchemas.set(deviceId, propertyDescriptors);
        return {
          ...state,
          schemas: newSchemas,
          version: state.version + 1,
        };
      });

      console.log(
        `[DeviceSchemaStore] Schema set for device "${deviceId}" with ${propertyDescriptors.size} properties`
      );
    },

    removeDeviceSchema: (deviceId) => {
      set((state) => {
        const newSchemas = new Map(state.schemas);
        const removed = newSchemas.delete(deviceId);

        if (removed) {
          console.log(`[DeviceSchemaStore] Schema removed for device "${deviceId}"`);
          return {
            ...state,
            schemas: newSchemas,
            version: state.version + 1,
          };
        }

        return state;
      });
    },

    getPropertySchema: (deviceId, propertyId) => {
      const deviceSchema = get().schemas.get(deviceId);
      return deviceSchema?.get(propertyId);
    },

    getDeviceSchema: (deviceId) => {
      return get().schemas.get(deviceId);
    },
  };
});
