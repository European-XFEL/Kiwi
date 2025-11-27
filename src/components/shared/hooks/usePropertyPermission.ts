import { useMemo } from "react";
import {
  usePropertyPermissionsStore,
  type PropertyPermissionState,
} from "@/store/usePropertyPermissionsStore";

/**
 * Hook to get property permissions from the store.
 *
 * Automatically reacts to changes in:
 * - Schema attributes (accessMode, requiredAccessLevel)
 * - User's access level (Expert/Operator/Observer)
 * - Device online state
 *
 * @param deviceId - Device ID (from useKaraboPropertyInfo)
 * @param propertyId - Property ID (from useKaraboPropertyInfo)
 * @returns Permission state with canEdit flag and disabledReason
 */
export function usePropertyPermissions(
  deviceId: string | undefined,
  propertyId: string | undefined
): PropertyPermissionState {
  // Subscribe to version changes (triggers when any source store updates)
  const version = usePropertyPermissionsStore((s) => s.version);

  // Recalculate permissions when version bumps
  return useMemo(() => {
    return usePropertyPermissionsStore.getState().getPermissions(deviceId, propertyId);
  }, [deviceId, propertyId, version]);
}
