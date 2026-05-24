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
  createPropertyProxySnapshots,
  type PropertyProxySnapshot,
  type PropertyProxies,
} from '../utils/controller_proxies';

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
// `primary` currently means the enriched primary controller context, not `proxies[0]`.
// If we align names later, `primary` may become the raw primary proxy and the
// current `primary` object may be renamed to `primaryContext`.
export interface ControllerContainerContext {
  primary: ControllerPrimaryContext;
  primaryProxy: PropertyProxies[number] | undefined;
  proxies: PropertyProxies;
  userAccessLevel: AccessLevel;
}

const getPrimaryProxy = (
  propertyProxies: PropertyProxies
): PropertyProxies[number] | undefined => propertyProxies[0];

const getPrimarySnapshot = (
  proxySnapshots: PropertyProxySnapshot[]
): PropertyProxySnapshot | undefined => proxySnapshots[0];

const getPrimaryKey = (proxySnapshots: PropertyProxySnapshot[]): string =>
  getPrimarySnapshot(proxySnapshots)?.sourceKey ?? '';

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

  const primaryKey = getPrimaryKey(proxySnapshots);
  const primaryProxy = getPrimaryProxy(propertyProxies);
  const rootDeviceProxy = primaryProxy?.root;
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
  const propertyPath = primaryProxy?.path ?? '';
  const propertyMissing = !!primaryProxy && !primaryProxy.binding;
  const proxyBinding = primaryProxy?.binding;
  const proxyIsEditable =
    !!proxyBinding &&
    proxyBinding.accessMode === AccessMode.RECONFIGURABLE &&
    userAccessLevel >= proxyBinding.requiredAccessLevel &&
    proxyBinding.is_allowed(rootDeviceProxy?.state ?? '');

  const disabledReason = React.useMemo(() => {
    if (!primaryKey) return 'No property specified';
    if (!primaryProxy || !deviceId || !propertyPath) return undefined;
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
    primaryProxy,
    proxyStatus,
  ]);

  const canEdit =
    !!primaryKey &&
    !!primaryProxy &&
    !!deviceId &&
    !!propertyPath &&
    !propertyMissing &&
    !isOffline &&
    proxyIsEditable;

  const tooltipText = React.useMemo(() => {
    const nonEmptyLabels = proxySnapshots
      .map((ctx) => ctx.sourceKey)
      .filter(Boolean);
    return nonEmptyLabels.length > 0 ? nonEmptyLabels.join(', ') : primaryKey;
  }, [primaryKey, proxySnapshots]);

  const proxyValue = primaryProxy?.value;
  const proxyTimestamp = primaryProxy?.timestamp;
  const proxyHashType = proxyBinding?.hashType;
  const proxyPropertyStatus = primaryProxy
    ? proxyBinding
      ? PropertyStatus.NONE
      : PropertyStatus.MISSING
    : PropertyStatus.MISSING;

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
      propertyPath: primaryProxy?.path,
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
    primaryProxy?.path,
    tooltipText,
    userAccessLevel,
  ]);

  return {
    primary,
    primaryProxy,
    proxies: propertyProxies,
    userAccessLevel,
  };
}
