import * as React from 'react';
import { getTopology } from '@/singletons/api';
import type { HashValues } from '@/karabo-hash/hash';
import type { HashTypes } from '@/karabo-hash/typenums';
import { PropertyProxy } from '@/lib/binding/PropertyProxy';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { splitKaraboKeys } from './utils/splitKaraboKeys';
import { ProxyStatus, PropertyStatus } from '@/lib/binding/ProxyStatus';
import {
  DEVICE_INDICATORS,
  PROPERTY_INDICATORS,
} from '@/lib/binding/OverlayIndicator';
import type { ProxyStatusIcon, ProxyBindingIcon } from '@/lib/binding/types';
import { Timestamp } from '@/karabo-hash/timestamp';
import { BaseBinding } from './BaseBinding';
import { AccessMode, AccessLevel } from '@/karabo-hash/enums';

export interface UsePropertyProxyUpdate {
  binding: BaseBinding | undefined;
  value: HashValues | undefined;
  timestamp: Timestamp | undefined;

  hashType: HashTypes | undefined;
  deviceState: string | undefined;

  deviceId: string | undefined;
  propertyPath: string | undefined;

  isEditable: boolean;
  proxyStatus: ProxyStatus;
  missing: ProxyStatusIcon | undefined;
  isOffline: boolean;

  propertyStatus: PropertyStatus;
  propertyIndicator: ProxyBindingIcon | undefined;
}

interface ProxyValue {
  binding: BaseBinding | undefined;
  value: HashValues | undefined;
  timestamp: Timestamp | undefined;
}

interface RootProxyValue {
  deviceState: string | undefined;
  proxyStatus: ProxyStatus;
}

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

  const [proxyData, setProxyData] = React.useState<ProxyValue>(() => ({
    binding: undefined,
    value: undefined,
    timestamp: undefined,
  }));

  const [rootProxyData, setRootProxyData] = React.useState<RootProxyValue>(
    () => ({
      deviceState: undefined,
      proxyStatus: ProxyStatus.OFFLINE,
    })
  );

  React.useEffect(() => {
    if (!deviceId || !propertyPath) {
      setProxyData({
        binding: undefined,
        value: undefined,
        timestamp: undefined,
      });
      setRootProxyData({
        deviceState: undefined,
        proxyStatus: ProxyStatus.OFFLINE,
      });
      return;
    }

    const root_proxy = getTopology().getDevice(deviceId);
    const removeMonitor = root_proxy.addMonitor();
    const proxy = new PropertyProxy(root_proxy, propertyPath);

    setRootProxyData({
      deviceState: root_proxy.state,
      proxyStatus: root_proxy.status,
    });
    setProxyData({
      binding: proxy.binding,
      value: proxy.value,
      timestamp: proxy.timestamp,
    });

    const removeValueUpdate = proxy.value_update((p) => {
      setProxyData({
        binding: p.binding,
        value: p.value,
        timestamp: p.timestamp,
      });
    });

    const removeSchemaMonitor = root_proxy.binding_update(() => {
      setProxyData((prev) =>
        prev.binding === proxy.binding
          ? prev
          : { ...prev, binding: proxy.binding }
      );
    });

    const updateRootProxyData = () => {
      setRootProxyData((prev) => {
        const next = {
          deviceState: root_proxy.state,
          proxyStatus: root_proxy.status,
        };
        return prev.deviceState === next.deviceState &&
          prev.proxyStatus === next.proxyStatus
          ? prev
          : next;
      });
    };

    const removeState = root_proxy.state_update.subscribe(updateRootProxyData);
    const removeStatus =
      root_proxy.status_update.subscribe(updateRootProxyData);

    return () => {
      removeMonitor();
      removeValueUpdate();
      removeSchemaMonitor();
      removeState();
      removeStatus();
    };
  }, [deviceId, propertyPath]);

  const binding = proxyData.binding;
  const proxyStatus = rootProxyData.proxyStatus;

  const missing =
    DEVICE_INDICATORS.find((d) => d.status === proxyStatus) ?? undefined;

  const isOffline = proxyStatus === ProxyStatus.OFFLINE;

  const isEditable =
    binding?.accessMode === AccessMode.RECONFIGURABLE &&
    binding?.requiredAccessLevel < userAccessLevel;

  const propertyStatus = !binding
    ? PropertyStatus.MISSING
    : PropertyStatus.NONE;

  const propertyIndicator =
    PROPERTY_INDICATORS.find((p) => p.status === propertyStatus) ?? undefined;

  const hashType = (binding?.hashType as HashTypes | undefined) ?? undefined;

  return {
    binding,
    value: proxyData.value,
    timestamp: proxyData.timestamp,
    hashType,

    deviceState: rootProxyData.deviceState,
    deviceId: deviceId || undefined,
    propertyPath: propertyPath || undefined,

    isEditable,
    proxyStatus,
    missing,
    isOffline,
    propertyStatus,
    propertyIndicator,
  };
}
