import React from 'react';

import {
  createPropertyProxies,
  disposePropertyProxies,
  startMonitoring,
  type PropertyProxyEntries,
} from '../utils/controller_proxies';

type ProxiesState = {
  keysIdentity: string;
  entries: PropertyProxyEntries;
  deviceRevisions: Map<string, number>;
};

const buildDeviceRevisions = (
  entries: PropertyProxyEntries
): Map<string, number> => {
  const revisions = new Map<string, number>();

  entries.forEach((propertyProxy) => {
    revisions.set(propertyProxy.root.deviceId, propertyProxy.root.rootRevision);
  });

  return revisions;
};

const getDeviceRevision = (
  entries: PropertyProxyEntries,
  deviceId: string
): number => {
  const propertyProxy = entries.find(
    (candidate) => candidate.root.deviceId === deviceId
  );

  if (!propertyProxy) {
    throw new Error(`Expected monitored proxy for device ${deviceId}`);
  }

  return propertyProxy.root.rootRevision;
};

export function useProxies(keys: string[]): PropertyProxyEntries {
  const ownerRef = React.useRef({});

  const keysIdentity = React.useMemo(() => JSON.stringify(keys), [keys]);
  const stableKeys = React.useMemo(() => [...keys], [keysIdentity]);

  const [proxiesState, setProxiesState] = React.useState<ProxiesState>(() => ({
    keysIdentity,
    entries: [],
    deviceRevisions: new Map(),
  }));

  const entries =
    proxiesState.keysIdentity === keysIdentity ? proxiesState.entries : [];

  React.useEffect(() => {
    const entries = createPropertyProxies(stableKeys);

    const stopMonitoring = startMonitoring(
      entries,
      ownerRef.current,
      (deviceId) => {
        setProxiesState((prev) => {
          if (prev.keysIdentity !== keysIdentity) return prev;

          const nextRevision = getDeviceRevision(entries, deviceId);
          if (prev.deviceRevisions.get(deviceId) === nextRevision) return prev;

          const nextDeviceRevisions = new Map(prev.deviceRevisions);
          nextDeviceRevisions.set(deviceId, nextRevision);

          return {
            keysIdentity: prev.keysIdentity,
            entries: [...prev.entries],
            deviceRevisions: nextDeviceRevisions,
          };
        });
      },
      () => {
        setProxiesState((prev) => {
          if (prev.keysIdentity !== keysIdentity) return prev;

          return {
            keysIdentity: prev.keysIdentity,
            entries: [...prev.entries],
            deviceRevisions: prev.deviceRevisions,
          };
        });
      }
    );

    setProxiesState({
      keysIdentity,
      entries,
      deviceRevisions: buildDeviceRevisions(entries),
    });

    return () => {
      stopMonitoring();
      disposePropertyProxies(entries);
    };
  }, [keysIdentity, stableKeys]);

  return entries;
}
