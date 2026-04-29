/**
 * useController — device subscription + controller UI state.
 */

import React from 'react';
import {
  ProxyStatus,
  PropertyStatus,
  type UsePropertyProxyUpdate,
} from '@/lib/binding/api';
import { DEVICE_INDICATORS } from '@/lib/OverlayIndicator';
import { splitKaraboKeys } from '@/lib/binding/utils/splitKaraboKeys';
import { AccessLevel } from '@/karabo/data/enums';
import { useGlobalStore } from '@/store/globalAppStateStore';
import useDeviceRoot from './useDeviceRoot';
import type { UseDeviceRootResult } from './useDeviceRoot';
import usePropertyProxies from './usePropertyProxies';
import type { PropertyProxyContext } from './usePropertyProxies';

// ControllerContainerContext
// ---
// Everything a widget component needs from the device layer.
// Injected into widgets as the `ctx` prop.

export interface ControllerContainerContext {
  root: UseDeviceRootResult; //from keys[0]
  proxies: PropertyProxyContext[];
  proxy: PropertyProxyContext | undefined;
  userAccessLevel: AccessLevel;
  canEdit: boolean;
  isEnabled: boolean;
  disabledReason?: string;
  tooltipText: string;
  /** Raw binding result — gives widgets access to value, binding schema, timestamp. */
  primary: UsePropertyProxyUpdate;
}

export type { UseDeviceRootResult, PropertyProxyContext };

const getControllerRootTarget = (keys: string[]) => {
  const key = keys[0] ?? ''; //from keys[0], the root of the controller
  if (!key.includes('.')) {
    return { key, deviceId: '', propertyPath: '' };
  }

  return { key, ...splitKaraboKeys(key) };
};

// useController
// ---

export function useController(keys: string[]): ControllerContainerContext {
  const userAccessLevel = useGlobalStore(
    (s) => s.sessionInfo?.accessLevel ?? AccessLevel.OBSERVER
  );
  const controllerKeysIdentity = React.useMemo(
    () => JSON.stringify(keys),
    [keys]
  );
  const stableKeys = React.useMemo(() => keys, [controllerKeysIdentity]);
  const controllerRootTarget = React.useMemo(
    () => getControllerRootTarget(stableKeys),
    [stableKeys]
  );

  const { key: primaryKey, deviceId, propertyPath } = controllerRootTarget;

  const controllerRootContext = useDeviceRoot(deviceId || undefined);
  const controllerDeviceRoot = controllerRootContext.root; //from keys[0]

  const proxies = usePropertyProxies(stableKeys, controllerDeviceRoot);
  const proxy = proxies[0];
  const propertyProxy = proxy?.proxy;
  const { deviceState, isOffline, proxyStatus } = controllerRootContext;

  const propertyMissing = proxy?.propertyStatus === PropertyStatus.MISSING;
  const proxyIsEditable = propertyProxy?.isEditable(userAccessLevel) ?? false;

  const disabledReason = React.useMemo(() => {
    if (!primaryKey) return 'No property specified';
    if (!deviceId || !propertyPath) return 'Invalid property key';
    if (propertyMissing)
      return `${deviceId}.${propertyPath} missing from Schema`;
    if (proxyStatus === ProxyStatus.OFFLINE)
      return `${deviceId}.${propertyPath}`;
    return undefined;
  }, [primaryKey, deviceId, propertyPath, propertyMissing, proxyStatus]);

  const canEdit =
    !!primaryKey &&
    !!deviceId &&
    !!propertyPath &&
    !propertyMissing &&
    !isOffline &&
    proxyIsEditable;

  const tooltipText = React.useMemo(() => {
    const nonEmptyLabels = stableKeys.filter(Boolean);
    return nonEmptyLabels.length > 0
      ? nonEmptyLabels.join(', ')
      : primaryKey || '';
  }, [primaryKey, stableKeys]);

  const proxyBinding = propertyProxy?.binding;
  const proxyValue = propertyProxy?.value;
  const proxyTimestamp = propertyProxy?.timestamp;
  const proxyHashType = proxyBinding?.hashType;
  const proxyPropertyStatus = proxy?.propertyStatus ?? PropertyStatus.MISSING;

  const primary: UsePropertyProxyUpdate = React.useMemo(() => {
    const missing =
      DEVICE_INDICATORS.find((d) => d.status === proxyStatus) ?? undefined;

    return {
      binding: proxyBinding,
      value: proxyValue,
      timestamp: proxyTimestamp,
      hashType: proxyHashType,
      deviceState,
      deviceId: deviceId || undefined,
      propertyPath: propertyPath || undefined,
      isEditable: proxyIsEditable,
      proxyStatus,
      missing,
      isOffline,
      propertyStatus: proxyPropertyStatus,
      propertyIndicator: undefined,
    };
  }, [
    deviceId,
    deviceState,
    isOffline,
    propertyPath,
    proxyBinding,
    proxyHashType,
    proxyIsEditable,
    proxyPropertyStatus,
    proxyStatus,
    proxyTimestamp,
    proxyValue,
  ]);

  return {
    root: controllerRootContext,
    proxies,
    proxy,
    userAccessLevel,
    canEdit,
    isEnabled: canEdit,
    disabledReason,
    tooltipText,
    primary,
  };
}
