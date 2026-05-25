import React from 'react';

import { AccessLevel } from '@/karabo/data/enums';
import type { DeviceProxy } from '@/lib/binding/DeviceProxy';
import { ProxyStatus, type UsePropertyProxyUpdate } from '@/lib/binding/api';
import { DEVICE_INDICATORS } from '@/lib/OverlayIndicator';
import { useGlobalStore } from '@/store/globalAppStateStore';
import {
  createPropertyProxySnapshots,
  type PropertyProxies,
} from '../utils/controller_proxies';
import {
  getControllerIndicator,
  getPrimaryControllerKey,
  isProxyAllowed,
} from '../utils/controller_semantics';

// ControllerContainerContext
// ---

export type { PropertyProxies };

export interface ControllerRootContext {
  deviceProxy: DeviceProxy | undefined;
  deviceId: string | undefined;
  deviceState: string | undefined;
  deviceStatus: ProxyStatus;
  isOffline: boolean;
}

export interface ControllerPrimaryContext extends UsePropertyProxyUpdate {
  rootDevice: ControllerRootContext | undefined;
  userAccessLevel: AccessLevel;
  canEdit: boolean;
  isEnabled: boolean;
  disabledReason?: string;
  tooltipText: string;
}

// Naming note:
// `primary` is the enriched controller context.
// `proxy` is the raw root proxy, i.e. `proxies[0]`.
export interface ControllerContainerContext {
  primary: ControllerPrimaryContext;
  proxy: PropertyProxies[number] | undefined;
  proxies: PropertyProxies;
  userAccessLevel: AccessLevel;
}

const getProxy = (
  propertyProxies: PropertyProxies
): PropertyProxies[number] | undefined => propertyProxies[0];

// useController
// ---
// Receives ordered live proxies already created by useProxies.
// Owns: root-slot semantics and the primary view context consumed by renderers.

export function useController(
  propertyProxies: PropertyProxies
): ControllerContainerContext {
  const userAccessLevel = useGlobalStore(
    (s) => s.sessionInfo?.accessLevel ?? AccessLevel.OBSERVER
  );
  const proxySnapshots = React.useMemo(
    () => createPropertyProxySnapshots(propertyProxies),
    [propertyProxies]
  );

  const sourceKeys = React.useMemo(
    () => proxySnapshots.map((snapshot) => snapshot.sourceKey),
    [proxySnapshots]
  );
  const primaryKey = getPrimaryControllerKey(proxySnapshots);
  const proxy = getProxy(propertyProxies);
  const rootDeviceProxy = proxy?.root;
  const proxyStatus = rootDeviceProxy?.status ?? ProxyStatus.OFFLINE;
  const isOffline = proxyStatus === ProxyStatus.OFFLINE;
  const rootDevice = rootDeviceProxy
    ? {
        deviceProxy: rootDeviceProxy,
        deviceId: rootDeviceProxy.deviceId,
        deviceState: rootDeviceProxy.state,
        deviceStatus: proxyStatus,
        isOffline,
      }
    : undefined;
  const deviceId = rootDeviceProxy?.deviceId ?? '';
  const propertyPath = proxy?.path ?? '';
  const proxyBinding = proxy?.binding;
  const proxyIsEditable = isProxyAllowed(proxy, userAccessLevel);
  const controllerIndicator = getControllerIndicator(sourceKeys, proxy);

  const canEdit =
    !!primaryKey &&
    !!proxy &&
    !!deviceId &&
    !!propertyPath &&
    !isOffline &&
    proxyIsEditable;

  const tooltipText = controllerIndicator.bindingLabel ?? primaryKey;

  const proxyValue = proxy?.value;
  const proxyTimestamp = proxy?.timestamp;
  const proxyHashType = proxyBinding?.hashType;

  const primary: ControllerPrimaryContext = React.useMemo(() => {
    const missing =
      DEVICE_INDICATORS.find((d) => d.status === proxyStatus) ?? undefined;

    return {
      binding: proxyBinding,
      value: proxyValue,
      timestamp: proxyTimestamp,
      hashType: proxyHashType,
      deviceState: rootDevice?.deviceState,
      deviceId: rootDevice?.deviceId,
      propertyPath: proxy?.path,
      isEditable: proxyIsEditable,
      proxyStatus,
      missing,
      isOffline,
      existing: proxy?.existing ?? false,
      propertyStatus: controllerIndicator.propertyStatus,
      propertyIndicator: controllerIndicator.propertyIndicator,
      rootDevice,
      userAccessLevel,
      canEdit,
      isEnabled: canEdit,
      disabledReason: controllerIndicator.statusText,
      tooltipText,
    };
  }, [
    canEdit,
    controllerIndicator,
    isOffline,
    proxyBinding,
    proxyHashType,
    proxyIsEditable,
    proxyStatus,
    proxyTimestamp,
    proxyValue,
    rootDevice,
    proxy?.path,
    tooltipText,
    userAccessLevel,
  ]);

  return {
    primary,
    proxy,
    proxies: propertyProxies,
    userAccessLevel,
  };
}
