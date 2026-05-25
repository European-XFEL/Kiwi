import * as React from 'react';
import { getTopology } from '@/lib/singletons/api';
import type { HashValues } from '@/karabo/data/hash';
import type { HashType } from '@/karabo/data/typenums';
import { PropertyProxy } from '@/lib/binding/PropertyProxy';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { splitKaraboKeys } from './utils/splitKaraboKeys';
import { ProxyStatus, PropertyStatus } from '@/lib/binding/ProxyStatus';
import { DEVICE_INDICATORS, PROPERTY_INDICATORS } from '@/lib/OverlayIndicator';
import type { ProxyStatusIcon, ProxyBindingIcon } from '@/lib/binding/types';
import { Timestamp } from '@/karabo/data/timestamp';
import { BaseBinding } from './BaseBinding';
import { AccessMode, AccessLevel } from '@/karabo/data/enums';
import { DeviceProxy } from './DeviceProxy';

export interface UsePropertyProxyUpdate {
  binding: BaseBinding | undefined;
  value: HashValues | undefined;
  timestamp: Timestamp | undefined;

  hashType: HashType | undefined;
  deviceState: string | undefined;

  deviceId: string | undefined;
  propertyPath: string | undefined;

  isEditable: boolean;
  proxyStatus: ProxyStatus;
  missing: ProxyStatusIcon | undefined;
  isOffline: boolean;
  existing: boolean;

  propertyStatus: PropertyStatus;
  propertyIndicator: ProxyBindingIcon | undefined;
}

interface ProxyValue {
  binding: BaseBinding | undefined;
  value: HashValues | undefined;
  timestamp: Timestamp | undefined;
  existing: boolean;
}

interface RootProxyValue {
  deviceState: string | undefined;
  proxyStatus: ProxyStatus;
}

type ProxyStore = {
  root: DeviceProxy;
  proxy: PropertyProxy;
  updaters: Array<() => void>;
};

const EMPTY_PROXY: ProxyValue = {
  binding: undefined,
  value: undefined,
  timestamp: undefined,
  existing: true,
};

const EMPTY_ROOT: RootProxyValue = {
  deviceState: undefined,
  proxyStatus: ProxyStatus.OFFLINE,
};

export function usePropertyProxy(
  karaboKeys: string | undefined
): UsePropertyProxyUpdate {
  const { deviceId, propertyPath } = React.useMemo(() => {
    if (!karaboKeys?.includes('.')) return { deviceId: '', propertyPath: '' };
    return splitKaraboKeys(karaboKeys);
  }, [karaboKeys]);

  const userAccessLevel = useGlobalStore(
    (s) => s.sessionInfo?.accessLevel ?? AccessLevel.OBSERVER
  );

  const storeRef = React.useRef<ProxyStore | null>(null);

  const [proxyData, setProxyData] = React.useState<ProxyValue>(
    () => EMPTY_PROXY
  );
  const [rootProxyData, setRootProxyData] = React.useState<RootProxyValue>(
    () => EMPTY_ROOT
  );

  const storeMatchesKeys =
    !!deviceId &&
    !!propertyPath &&
    storeRef.current?.root.deviceId === deviceId &&
    storeRef.current?.proxy.path === propertyPath;

  React.useEffect(() => {
    if (!deviceId || !propertyPath) {
      setProxyData(EMPTY_PROXY);
      setRootProxyData(EMPTY_ROOT);
      return;
    }

    const root = getTopology().getDevice(deviceId);
    const proxy = new PropertyProxy(root, propertyPath);
    const store: ProxyStore = { root, proxy, updaters: [] };
    storeRef.current = store;

    setRootProxyData({ deviceState: root.state, proxyStatus: root.status });
    setProxyData({
      binding: proxy.binding,
      value: proxy.value,
      timestamp: proxy.timestamp,
      existing: proxy.existing,
    });

    const updateRoot = () => {
      setRootProxyData((prev) => {
        const next = { deviceState: root.state, proxyStatus: root.status };
        return prev.deviceState === next.deviceState &&
          prev.proxyStatus === next.proxyStatus
          ? prev
          : next;
      });
    };

    store.updaters.push(root.addMonitor());

    store.updaters.push(
      proxy.value_update((p: PropertyProxy) => {
        setProxyData({
          binding: p.binding,
          value: p.value,
          timestamp: p.timestamp,
          existing: p.existing,
        });
      })
    );

    store.updaters.push(
      root.binding_update(() => {
        setProxyData((prev) =>
          prev.binding === proxy.binding && prev.existing === proxy.existing
            ? prev
            : { ...prev, binding: proxy.binding, existing: proxy.existing }
        );
      })
    );

    store.updaters.push(root.state_update.subscribe(store, updateRoot));
    store.updaters.push(root.status_update.subscribe(store, updateRoot));

    return () => {
      store.updaters.forEach((fn) => fn());
      store.updaters = [];
      store.proxy.dispose();
      if (storeRef.current === store) {
        storeRef.current = null;
      }
      setProxyData(EMPTY_PROXY);
      setRootProxyData(EMPTY_ROOT);
    };
  }, [deviceId, propertyPath]);

  const currentProxyData = storeMatchesKeys ? proxyData : EMPTY_PROXY;
  const currentRootProxyData = storeMatchesKeys ? rootProxyData : EMPTY_ROOT;

  const binding = currentProxyData.binding;
  const existing = currentProxyData.existing;
  const proxyStatus = currentRootProxyData.proxyStatus;

  const missing =
    DEVICE_INDICATORS.find((d) => d.status === proxyStatus) ?? undefined;

  const isOffline = proxyStatus === ProxyStatus.OFFLINE;

  const isEditable =
    binding?.accessMode === AccessMode.RECONFIGURABLE &&
    binding?.requiredAccessLevel < userAccessLevel;

  const propertyStatus = existing
    ? PropertyStatus.NONE
    : PropertyStatus.MISSING;

  const propertyIndicator = !existing
    ? (PROPERTY_INDICATORS.find((p) => p.status === PropertyStatus.MISSING) ??
      undefined)
    : binding
      ? (PROPERTY_INDICATORS.find((p) => p.status === PropertyStatus.NONE) ??
        undefined)
      : undefined;

  const hashType = (binding?.hashType as HashType | undefined) ?? undefined;

  return {
    binding,
    value: currentProxyData.value,
    timestamp: currentProxyData.timestamp,
    hashType,

    deviceState: currentRootProxyData.deviceState,
    deviceId: deviceId || undefined,
    propertyPath: propertyPath || undefined,

    isEditable,
    proxyStatus,
    missing,
    isOffline,
    existing,
    propertyStatus,
    propertyIndicator,
  };
}
