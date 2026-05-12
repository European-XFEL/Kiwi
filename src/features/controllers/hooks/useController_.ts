import React from 'react';

import { AccessLevel } from '@/karabo/data/enums';
import { useGlobalStore } from '@/store/globalAppStateStore';
import {
  createEmptyProxyContexts,
  createPropertyProxies,
  createPropertyProxyContext,
  createPropertyProxyContexts,
  disposePropertyProxies,
  startMonitoring,
  validateKeys,
  type PropertyProxyContext,
} from '../utils/controller_proxies';

// ControllerContainerContext
// ---

export type { PropertyProxyContext };

export interface ControllerContainerContext {
  /** Property context for keys[0]. It owns controller-level overlay semantics. */
  root: PropertyProxyContext | undefined;
  /** Property proxy contexts in the same order as controller keys. */
  propertyProxies: PropertyProxyContext[];
  userAccessLevel: AccessLevel;
}

// useController
// ---

export function useController(keys: string[]): ControllerContainerContext {
  const userAccessLevel = useGlobalStore(
    (s) => s.sessionInfo?.accessLevel ?? AccessLevel.OBSERVER
  );

  const ownerRef = React.useRef({});

  // Stable identity across renders; only changes when key content changes.
  const keysIdentity = React.useMemo(() => JSON.stringify(keys), [keys]);
  const keyTargets = React.useMemo(() => {
    return validateKeys(keys);
    // keysIdentity drives re-runs; keys itself is intentionally excluded
    // to avoid re-running on every render when the array is recreated inline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysIdentity]);

  const emptyPropertyProxyContexts = React.useMemo(
    () => createEmptyProxyContexts(keyTargets),
    [keyTargets]
  );

  // Keyed state; property proxy contexts are only valid for the keysIdentity
  // they were built from.
  // When keys change, the effect hasn't run yet so we return empty property proxy
  // contexts for that one render instead of serving stale data from the previous
  // key set.
  const [propertyProxyContextState, setPropertyProxyContextState] =
    React.useState<{
      keysIdentity: string;
      propertyProxyContexts: PropertyProxyContext[];
    }>(() => ({
      keysIdentity,
      propertyProxyContexts: emptyPropertyProxyContexts,
    }));

  const propertyProxyContexts =
    propertyProxyContextState.keysIdentity === keysIdentity
      ? propertyProxyContextState.propertyProxyContexts
      : emptyPropertyProxyContexts;

  React.useEffect(() => {
    const entries = createPropertyProxies(keyTargets);

    const stopMonitoring = startMonitoring(
      entries,
      ownerRef.current,

      // onDeviceUpdate: rebuild every property proxy context whose device changed.
      // Reading from the live entry avoids relying on potentially stale prev state.
      (deviceId) => {
        setPropertyProxyContextState((prev) => {
          if (prev.keysIdentity !== keysIdentity) return prev;
          const next = prev.propertyProxyContexts.map(
            (propertyProxyContext, i) => {
              const propertyProxy = entries[i];
              return propertyProxy?.root.deviceId === deviceId
                ? createPropertyProxyContext(propertyProxy)
                : propertyProxyContext;
            }
          );
          return { keysIdentity, propertyProxyContexts: next };
        });
      },

      // onProxyUpdate: rebuild the updated slot from the live proxy parameter,
      // in case the initial state update hasn't committed yet when this fires.
      (index, proxy) => {
        setPropertyProxyContextState((prev) => {
          if (prev.keysIdentity !== keysIdentity) return prev;
          const next = [...prev.propertyProxyContexts];
          next[index] = createPropertyProxyContext(proxy);
          return { keysIdentity, propertyProxyContexts: next };
        });
      }
    );

    // startMonitoring() calls addMonitor(), which can synchronously change device
    // status. Take the initial snapshot after that setup so the first committed
    // property proxy contexts include those synchronous transitions.
    setPropertyProxyContextState({
      keysIdentity,
      propertyProxyContexts: createPropertyProxyContexts(entries, keyTargets),
    });

    return () => {
      stopMonitoring();
      disposePropertyProxies(entries);
    };
  }, [keysIdentity, keyTargets]);

  const root = keyTargets[0] ? propertyProxyContexts[0] : undefined;

  return {
    root,
    propertyProxies: propertyProxyContexts,
    userAccessLevel,
  };
}
