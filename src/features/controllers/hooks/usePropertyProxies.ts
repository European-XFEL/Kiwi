import React from 'react';
import { PropertyProxy } from '@/lib/binding/api';
import { PropertyStatus } from '@/lib/binding/ProxyStatus';
import { splitKaraboKeys } from '@/lib/binding/utils/splitKaraboKeys';
import { getTopology } from '@/lib/singletons/api';
import type { DeviceProxy } from '@/lib/binding/DeviceProxy';

export type PropertyProxyContext = {
  proxy: PropertyProxy | undefined;
  propertyPath: string | undefined;
  propertyStatus: PropertyStatus;
};

const EMPTY_PROPERTY_PROXY_CONTEXT: PropertyProxyContext = {
  proxy: undefined,
  propertyPath: undefined,
  propertyStatus: PropertyStatus.MISSING,
};
const EMPTY_PROPERTY_PROXY_CONTEXT_ARRAY: PropertyProxyContext[] = [];

type ProxyContextsState = {
  keysIdentity: string;
  contexts: PropertyProxyContext[];
  revision: number;
};

const getPropertyTarget = (key: string) =>
  key.includes('.') ? splitKaraboKeys(key) : undefined;

const snapshotProxyContext = (
  proxy: PropertyProxy | undefined,
  propertyPath: string | undefined
): PropertyProxyContext => ({
  proxy,
  propertyPath,
  propertyStatus: proxy?.binding ? PropertyStatus.NONE : PropertyStatus.MISSING,
});

const sameProxyContext = (
  a: PropertyProxyContext | undefined,
  b: PropertyProxyContext
) =>
  a?.proxy === b.proxy &&
  a?.propertyPath === b.propertyPath &&
  a?.propertyStatus === b.propertyStatus;

export default function usePropertyProxies(
  keys: string[],
  controllerDeviceRoot?: DeviceProxy //from keys[0]
): PropertyProxyContext[] {
  const keysIdentity = React.useMemo(() => JSON.stringify(keys), [keys]);
  const stableKeys = React.useMemo(() => keys, [keysIdentity]);
  const keyTargets = React.useMemo(
    () => stableKeys.map((key) => getPropertyTarget(key)),
    [stableKeys]
  );
  const controllerDeviceId = controllerDeviceRoot?.deviceId;
  const [proxyContextsState, setProxyContextsState] =
    React.useState<ProxyContextsState>({
      keysIdentity: '',
      contexts: [],
      revision: 0,
    });
  const stateIsStale = proxyContextsState.keysIdentity !== keysIdentity;

  React.useEffect(() => {
    if (stableKeys.length === 0) {
      setProxyContextsState({
        keysIdentity,
        contexts: [],
        revision: 0,
      });
      return;
    }

    const proxyEntries = keyTargets.map((target) => {
      if (!target?.deviceId || !target.propertyPath) return undefined;

      const deviceProxy = getTopology().getDevice(target.deviceId);
      return {
        deviceId: target.deviceId,
        deviceProxy,
        propertyPath: target.propertyPath,
        proxy: new PropertyProxy(deviceProxy, target.propertyPath),
      };
    });

    setProxyContextsState({
      keysIdentity,
      contexts: proxyEntries.map((entry, index) =>
        snapshotProxyContext(
          entry?.proxy,
          entry?.propertyPath ?? keyTargets[index]?.propertyPath
        )
      ),
      revision: 0,
    });

    const cleanups: (() => void)[] = [];
    const monitoredDeviceIds = new Set<string>();

    proxyEntries.forEach((entry) => {
      if (!entry || monitoredDeviceIds.has(entry.deviceId)) return;

      monitoredDeviceIds.add(entry.deviceId);
      if (entry.deviceId !== controllerDeviceId) {
        cleanups.push(entry.deviceProxy.addMonitor());
      }
    });

    const syncProxyContext = (index: number, proxy: PropertyProxy) => {
      setProxyContextsState((prev) => {
        if (prev.keysIdentity !== keysIdentity) return prev;

        const nextContext = snapshotProxyContext(proxy, entryByIndex(index));
        if (sameProxyContext(prev.contexts[index], nextContext)) {
          // Force a rerender for live value changes while preserving context
          // object identities for metadata-dependent memos upstream.
          return {
            keysIdentity: prev.keysIdentity,
            contexts: prev.contexts,
            revision: prev.revision + 1,
          };
        }

        const next = [...prev.contexts];
        next[index] = nextContext;
        return {
          keysIdentity: prev.keysIdentity,
          contexts: next,
          revision: prev.revision + 1,
        };
      });
    };

    const entryByIndex = (index: number) =>
      proxyEntries[index]?.propertyPath ?? keyTargets[index]?.propertyPath;

    proxyEntries.forEach((entry, index) => {
      if (!entry) return;

      const unsub = entry.proxy.value_update((proxy: PropertyProxy) => {
        syncProxyContext(index, proxy);
      });
      cleanups.push(unsub);

      const unsubscribeBinding = entry.proxy.binding_update(
        (proxy: PropertyProxy) => {
          syncProxyContext(index, proxy);
        }
      );
      cleanups.push(unsubscribeBinding);
    });

    return () => {
      cleanups.forEach((fn) => fn());
      proxyEntries.forEach((entry) => entry?.proxy.dispose());
    };
  }, [controllerDeviceId, keyTargets, keysIdentity, stableKeys.length]);

  const currentProxyContexts = stateIsStale
    ? EMPTY_PROPERTY_PROXY_CONTEXT_ARRAY
    : proxyContextsState.contexts;

  return React.useMemo(
    () =>
      stableKeys.map((_, index) => {
        return (
          currentProxyContexts[index] ?? {
            ...EMPTY_PROPERTY_PROXY_CONTEXT,
            propertyPath: keyTargets[index]?.propertyPath,
          }
        );
      }),
    [currentProxyContexts, keyTargets, stableKeys]
  );
}
