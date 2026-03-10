/**
 * useController — device subscription + controller UI state.
 */

import React from 'react';
import {
  ProxyStatus,
  PropertyStatus,
  usePropertyProxy,
  type UsePropertyProxyUpdate,
} from '@/lib/binding/api';

// ControllerContainerContext
// ---
// Everything a widget component needs from the device layer.
// Injected into widgets as the `ctx` prop.

export interface ControllerContainerContext {
  canEdit: boolean;
  isEnabled: boolean;
  disabledReason?: string;
  tooltipText?: string;
  proxyStatus?: ProxyStatus;
  propertyMissing?: boolean;
  hasPendingEdits?: boolean;
  /** Raw binding result — gives widgets access to value, binding schema, timestamp. */
  primary: UsePropertyProxyUpdate;
}

// useController
// ---

export function useController(keys: string[]): ControllerContainerContext {
  const primaryKey = keys?.[0] ?? '';
  const primary = usePropertyProxy(primaryKey || undefined);

  const {
    deviceId,
    propertyPath,
    isEditable,
    proxyStatus,
    isOffline,
    propertyStatus,
  } = primary;

  const propertyMissing = propertyStatus === PropertyStatus.MISSING;

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
    isEditable;

  return {
    canEdit,
    isEnabled: canEdit,
    disabledReason,
    tooltipText: disabledReason || primaryKey,
    proxyStatus,
    propertyMissing,
    hasPendingEdits: false,
    primary,
  };
}
