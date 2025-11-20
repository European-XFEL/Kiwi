import { useMemo } from "react";
import { useKaraboPropertyInfo } from "./useKaraboProperty";
import { useKaraboKeysString } from "./useKaraboKeysString";
import { PropertyInfo } from "@/karabo_data/DeviceConfigInfo";

/**
 * Hook to monitor device state property
 *
 * @param deviceId - The device ID to monitor
 * @returns Object containing:
 * - state: Current device state string (e.g., "ACTIVE", "ON", "RUNNING")
 * - isInState: Function to check if current state matches any of the allowed states
 */
export function useDeviceState(deviceId: string) {
  // Device state is typically at deviceId.state
  const stateKeys = useMemo(() => [deviceId, "state"], [deviceId]);
  const keysStr = useKaraboKeysString(stateKeys);
  const { property } = useKaraboPropertyInfo(keysStr);
  const typedProperty = property as PropertyInfo | null;
  // Extract state value (as string)
  const state = useMemo(() => {
    if (!typedProperty?.value) return undefined;
    return String(typedProperty.value).toUpperCase();
  }, [typedProperty?.value]);

  /**
   * Check if current device state is in the list of allowed states
   * @param allowedStates - Array of allowed state strings (case-insensitive)
   * @returns true if current state matches any allowed state, false otherwise
   */
  const isInState = (allowedStates?: string[]): boolean => {
    if (!allowedStates || allowedStates.length === 0) {
      // No restrictions - all states allowed
      return true;
    }

    if (!state) {
      // No state available - assume not allowed
      return false;
    }

    // Check if current state is in allowed states (case-insensitive)
    return allowedStates.some(
      (allowedState) => allowedState.toUpperCase() === state
    );
  };

  return {
    state,
    isInState,
  };
}
