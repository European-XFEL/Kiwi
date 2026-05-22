import React from 'react';

import { AccessLevel, AccessMode } from '@/karabo/data/enums';
import type { DeviceProxy } from '@/lib/binding/DeviceProxy';
import {
  ProxyStatus,
  PropertyStatus,
  type UsePropertyProxyUpdate,
} from '@/lib/binding/api';
import { DEVICE_INDICATORS, PROPERTY_INDICATORS } from '@/lib/OverlayIndicator';
import { useGlobalStore } from '@/store/globalAppStateStore';
import {
  createPropertyProxyContexts,
  type PropertyProxyContext,
  type PropertyProxyEntries,
} from '../utils/controller_proxies';

// ControllerContainerContext
// ---

export type { PropertyProxyContext, PropertyProxyEntries };

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

export interface ControllerContainerContext {
  primary: ControllerPrimaryContext;
  proxies: PropertyProxyEntries;

  // Backward compatibility bridge:
  // New code should read `ctx.primary` and `ctx.proxies`.
  // Keep these top-level aliases until the remaining widgets migrate so the
  // contract change stays incremental instead of forcing a repo-wide rewrite.
  rootDevice: ControllerRootContext | undefined;
  proxyContexts: PropertyProxyContext[];
  rootProxy: PropertyProxyContext | undefined;
  userAccessLevel: AccessLevel;
  canEdit: boolean;
  isEnabled: boolean;
  isOffline: boolean;
  disabledReason?: string;
  tooltipText: string;
}

const getPrimaryProxy = (
  propertyProxies: PropertyProxyEntries
): PropertyProxyEntries[number] | undefined => propertyProxies[0];

const getPrimaryContext = (
  proxyContexts: PropertyProxyContext[]
): PropertyProxyContext | undefined => proxyContexts[0];

const getPrimaryKey = (proxyContexts: PropertyProxyContext[]): string =>
  getPrimaryContext(proxyContexts)?.sourceKey ?? '';

// useController
// ---
// Receives ordered live proxies already created by useProxies.
// Owns: root-slot semantics and the primary view context consumed by renderers.

export function useController(
  propertyProxies: PropertyProxyEntries
): ControllerContainerContext {
  const userAccessLevel = useGlobalStore(
    (s) => s.sessionInfo?.accessLevel ?? AccessLevel.OBSERVER
  );
  const proxyContexts = React.useMemo(
    () => createPropertyProxyContexts(propertyProxies),
    [propertyProxies]
  );

  const primaryContext = getPrimaryContext(proxyContexts);
  const primaryKey = getPrimaryKey(proxyContexts);
  const rootProxy = getPrimaryProxy(propertyProxies);
  const rootDeviceProxy = rootProxy?.root;
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
  const propertyPath = rootProxy?.path ?? '';
  const propertyMissing = !!rootProxy && !rootProxy.binding;
  const proxyBinding = rootProxy?.binding;
  const proxyIsEditable =
    !!proxyBinding &&
    proxyBinding.accessMode === AccessMode.RECONFIGURABLE &&
    userAccessLevel >= proxyBinding.requiredAccessLevel &&
    proxyBinding.is_allowed(rootDeviceProxy?.state ?? '');

  const disabledReason = React.useMemo(() => {
    if (!primaryKey) return 'No property specified';
    if (!rootProxy || !deviceId || !propertyPath) return undefined;
    if (propertyMissing)
      return `${deviceId}.${propertyPath} missing from Schema`;
    if (proxyStatus === ProxyStatus.OFFLINE)
      return `${deviceId}.${propertyPath} (offline)`;
    return undefined;
  }, [
    deviceId,
    primaryKey,
    propertyMissing,
    propertyPath,
    rootProxy,
    proxyStatus,
  ]);

  const canEdit =
    !!primaryKey &&
    !!rootProxy &&
    !!deviceId &&
    !!propertyPath &&
    !propertyMissing &&
    !isOffline &&
    proxyIsEditable;

  const tooltipText = React.useMemo(() => {
    const nonEmptyLabels = proxyContexts
      .map((ctx) => ctx.sourceKey)
      .filter(Boolean);
    return nonEmptyLabels.length > 0 ? nonEmptyLabels.join(', ') : primaryKey;
  }, [primaryKey, proxyContexts]);

  const proxyValue = rootProxy?.value;
  const proxyTimestamp = rootProxy?.timestamp;
  const proxyHashType = proxyBinding?.hashType;
  const proxyPropertyStatus = rootProxy
    ? proxyBinding
      ? PropertyStatus.NONE
      : PropertyStatus.MISSING
    : PropertyStatus.MISSING;

  const rootProxyContext = primaryContext;

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
      propertyPath: rootProxy?.path,
      isEditable: proxyIsEditable,
      proxyStatus,
      missing,
      isOffline,
      propertyStatus: proxyPropertyStatus,
      propertyIndicator:
        PROPERTY_INDICATORS.find((p) => p.status === proxyPropertyStatus) ??
        undefined,
      rootDevice,
      userAccessLevel,
      canEdit,
      isEnabled: canEdit,
      disabledReason,
      tooltipText,
    };
  }, [
    canEdit,
    disabledReason,
    isOffline,
    proxyBinding,
    proxyHashType,
    proxyIsEditable,
    proxyPropertyStatus,
    proxyStatus,
    proxyTimestamp,
    proxyValue,
    rootDevice,
    rootProxy?.path,
    tooltipText,
    userAccessLevel,
  ]);

  return {
    primary,
    proxies: propertyProxies,
    rootDevice,
    proxyContexts,
    rootProxy: rootProxyContext,
    userAccessLevel,
    canEdit,
    isEnabled: canEdit,
    isOffline,
    disabledReason,
    tooltipText,
  };
}
