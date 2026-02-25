/**
 * useControllerState — device subscription + controller UI state in one hook.
 */

import React from 'react';
import {
  ProxyStatus,
  PropertyStatus,
  useDeviceProperty,
  type UseDevicePropertyResult,
} from '@/lib/binding';

// ControllerContainerContext
// ---
// Everything a widget component needs from the device layer.
// Widgets receive this via render prop from ControllerContainer.

export interface ControllerContainerContext {
  canEdit: boolean;
  isEnabled: boolean;
  disabledReason?: string;
  tooltipText?: string;
  proxyStatus?: ProxyStatus;
  propertyMissing?: boolean;
  hasPendingEdits?: boolean;
  /** Raw binding result — gives widgets access to value, binding schema, timestamp. */
  primary: UseDevicePropertyResult;
}

// useControllerState
// ---

export function useControllerState(keys: string[]): ControllerContainerContext {
  const primaryKey = keys?.[0] ?? '';
  const primary = useDeviceProperty(primaryKey || undefined);

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
