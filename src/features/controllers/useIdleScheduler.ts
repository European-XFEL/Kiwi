import { useCallback, useEffect, useRef } from 'react';

// Keep the first pending task; repeated requests share its idle callback.
export function useIdleScheduler(timeout: number) {
  const pendingId = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (pendingId.current !== undefined) {
        window.cancelIdleCallback(pendingId.current);
        pendingId.current = undefined;
      }
    },
    []
  );

  return useCallback(
    (callback: () => void) => {
      if (pendingId.current !== undefined) return;
      pendingId.current = window.requestIdleCallback(
        () => {
          pendingId.current = undefined;
          callback();
        },
        { timeout }
      );
    },
    [timeout]
  );
}
