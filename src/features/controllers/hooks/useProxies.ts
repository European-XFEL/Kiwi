import React from 'react';

import {
  createPropertyProxies,
  disposePropertyProxies,
  startMonitoring,
  type PropertyProxies,
} from '../utils/controller_proxies';

type ProxiesState = {
  keysIdentity: string;
  proxies: PropertyProxies;
  deviceRevisions: Map<string, number>;
};

const buildDeviceRevisions = (
  proxies: PropertyProxies
): Map<string, number> => {
  const revisions = new Map<string, number>();

  proxies.forEach((propertyProxy) => {
    revisions.set(propertyProxy.root.deviceId, propertyProxy.root.rootRevision);
  });

  return revisions;
};

const getDeviceRevision = (
  proxies: PropertyProxies,
  deviceId: string
): number => {
  const propertyProxy = proxies.find(
    (candidate) => candidate.root.deviceId === deviceId
  );

  if (!propertyProxy) {
    throw new Error(`Expected monitored proxy for device ${deviceId}`);
  }

  return propertyProxy.root.rootRevision;
};

export function useProxies(keys: string[]): PropertyProxies {
  const ownerRef = React.useRef({});

  const keysIdentity = React.useMemo(() => JSON.stringify(keys), [keys]);
  const stableKeys = React.useMemo(() => [...keys], [keysIdentity]);

  const [proxiesState, setProxiesState] = React.useState<ProxiesState>(() => ({
    keysIdentity,
    proxies: [],
    deviceRevisions: new Map(),
  }));

  const proxies =
    proxiesState.keysIdentity === keysIdentity ? proxiesState.proxies : [];

  React.useEffect(() => {
    const proxies = createPropertyProxies(stableKeys);

    const stopMonitoring = startMonitoring(
      proxies,
      ownerRef.current,
      (deviceId) => {
        setProxiesState((prev) => {
          if (prev.keysIdentity !== keysIdentity) return prev;

          const nextRevision = getDeviceRevision(proxies, deviceId);
          if (prev.deviceRevisions.get(deviceId) === nextRevision) return prev;

          const nextDeviceRevisions = new Map(prev.deviceRevisions);
          nextDeviceRevisions.set(deviceId, nextRevision);

          return {
            keysIdentity: prev.keysIdentity,
            proxies: [...prev.proxies],
            deviceRevisions: nextDeviceRevisions,
          };
        });
      },
      () => {
        setProxiesState((prev) => {
          if (prev.keysIdentity !== keysIdentity) return prev;

          return {
            keysIdentity: prev.keysIdentity,
            proxies: [...prev.proxies],
            deviceRevisions: prev.deviceRevisions,
          };
        });
      }
    );

    setProxiesState({
      keysIdentity,
      proxies,
      deviceRevisions: buildDeviceRevisions(proxies),
    });

    return () => {
      stopMonitoring();
      disposePropertyProxies(proxies);
    };
  }, [keysIdentity, stableKeys]);

  return proxies;
}
