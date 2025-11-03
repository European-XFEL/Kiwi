import React from "react";

/**
 * Custom hook that converts an array of keys to a comma-separated string.
 * Used for passing keys to Karabo hooks that expect a string format.
 *
 * @param keys - Array of key strings to join
 * @returns Memoized comma-separated string of keys
 *
 * @example
 * const keysStr = useKaraboKeysString(props.keys);
 * const { deviceId, property } = useKaraboPropertyInfo(keysStr);
 */
export function useKaraboKeysString(keys: string[] | undefined): string {
  return React.useMemo(() => (keys ? keys.join(",") : ""), [keys]);
}
