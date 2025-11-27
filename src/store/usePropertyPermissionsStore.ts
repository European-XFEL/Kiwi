import { create } from "zustand";
import { AccessLevel } from "@/karabo_data/SchemaEnums";
import { useDeviceSchemaStore } from "./useDeviceSchemaStore";
import { useGlobalStore } from "./globalAppStateStore";
import { useDeviceProxyStore } from "./useDeviceProxyStore";
import { PropertyPermissions, type PropertyPermissionResult } from "@/shared/helpers/PropertyPermissions";

// ─────────────────────────────────────────────────────────────
// STORE INTERFACE
// ─────────────────────────────────────────────────────────────

export interface PropertyPermissionState extends PropertyPermissionResult {
  disabledReason: string;
}

export interface PropertyPermissionsStore {
  /** Bump to trigger React re-renders when permissions change */
  version: number;

  /** Query method - calculates permissions on-the-fly from source stores */
  getPermissions: (
    deviceId: string | undefined,
    propertyId: string | undefined
  ) => PropertyPermissionState;
}

// ─────────────────────────────────────────────────────────────
// STORE IMPLEMENTATION
// ─────────────────────────────────────────────────────────────

export const usePropertyPermissionsStore = create<PropertyPermissionsStore>((set, get) => {
  // Subscribe to source stores and bump version when they change
  // This triggers React components to re-render and recalculate permissions

  // 1. Subscribe to schema changes
  useDeviceSchemaStore.subscribe((state, prevState) => {
    if (state.version !== prevState.version) {
      set((s) => ({ version: s.version + 1 }));
      console.log("[PropertyPermissionsStore] Schema changed, bumping version");
    }
  });

  // 2. Subscribe to access level changes
  let prevAccessLevel: AccessLevel | undefined;
  useGlobalStore.subscribe((state) => {
    const currentAccessLevel = state.sessionInfo?.accessLevel;
    if (currentAccessLevel !== prevAccessLevel) {
      prevAccessLevel = currentAccessLevel;
      set((s) => ({ version: s.version + 1 }));
      console.log(
        `[PropertyPermissionsStore] Access level changed to ${AccessLevel[currentAccessLevel ?? 0]}, bumping version`
      );
    }
  });

  // 3. Subscribe to device proxy changes (online/offline state)
  useDeviceProxyStore.subscribe((state, prevState) => {
    if (state.version !== prevState.version) {
      set((s) => ({ version: s.version + 1 }));
      console.log("[PropertyPermissionsStore] Device state changed, bumping version");
    }
  });

  return {
    version: 0,

    getPermissions: (deviceId, propertyId) => {
      // Return disabled state if no device/property
      if (!deviceId || !propertyId) {
        return {
          canEdit: false,
          requiredAccessLevel: AccessLevel.Observer,
          accessMode: undefined,
          deniedByLevel: false,
          deniedByMode: true,
          disabledReason: "No property specified",
          debugLabel: "no-property",
        };
      }

      // Get current access level
      const accessLevel =
        useGlobalStore.getState().sessionInfo?.accessLevel ?? AccessLevel.Observer;

      // Get device online state
      const isOnline = useDeviceProxyStore.getState().isDeviceOnline(deviceId);

      // Device offline → cannot edit
      if (!isOnline) {
        return {
          canEdit: false,
          requiredAccessLevel: AccessLevel.Observer,
          accessMode: undefined,
          deniedByLevel: false,
          deniedByMode: true,
          disabledReason: "Device offline",
          debugLabel: `${deviceId}/${propertyId}`,
        };
      }

      // Get schema attributes
      const schemaAttrs = useDeviceSchemaStore.getState().getPropertySchema(deviceId, propertyId);

      // Build a minimal PropertyInfo-like object for PropertyPermissions.getPermissions
      const propertyInfo = schemaAttrs
        ? {
            key: propertyId,
            schemaAttrs,
          }
        : null;

      // Calculate permissions using existing logic
      const perms = PropertyPermissions.getPermissions(propertyInfo as any, accessLevel);

      // Generate human-readable disabled reason
      let disabledReason = "";

      if (!perms.canEdit) {
        if (perms.deniedByMode) {
          if (perms.accessMode === 0) {
            // AccessMode.ReadOnly
            disabledReason = "Property is read-only and cannot be edited from the GUI";
          } else if (perms.accessMode === 1) {
            // AccessMode.InitOnly
            disabledReason =
              "Property is InitOnly and can only be configured via the device run file";
          } else {
            disabledReason = "Property is not editable in the current configuration";
          }
        } else if (perms.deniedByLevel && perms.requiredAccessLevel !== undefined) {
          disabledReason = `Requires access level ${AccessLevel[perms.requiredAccessLevel]} or higher`;
        } else {
          disabledReason = "Insufficient permissions to modify this property";
        }
      }

      return {
        ...perms,
        disabledReason,
      };
    },
  };
});
