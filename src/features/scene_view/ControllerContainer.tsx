import React from 'react';
import { PropertyOverlay } from './components/overlays/PropertyOverlay';
import { ProxyStatus, PropertyStatus } from '@/lib/binding';
import { useDeviceProperty, type UseDevicePropertyResult } from '@/lib/binding';
import { AccessMode } from '@/karabo_data/SchemaEnums';

/**
 * Runtime context computed by the container.
 * This is the "house provides utilities" contract.
 */
export interface ControllerContainerContext {
  canEdit: boolean;
  isEnabled: boolean;
  disabledReason?: string;
  tooltipText?: string;

  proxyStatus?: ProxyStatus;
  propertyMissing?: boolean;

  hasPendingEdits?: boolean;

  // property proxy infused here for optimization
  primary?: UseDevicePropertyResult;
}

/**
 * Children can be normal nodes or a render function.
 */
export type ControllerContainerChildren =
  | React.ReactNode
  | ((ctx: ControllerContainerContext) => React.ReactNode);

export interface ControllerContainerProps {
  keys: string[];
  x: number;
  y: number;
  width: number;
  height: number;

  children: ControllerContainerChildren;

  className?: string;
  showMissingPropertyOverlay?: boolean;
}

/**
 * ControllerContainer
 *
 * - absolute positioning
 * - overlay lifecycle
 * - computes controller runtime ctx
 */
export const ControllerContainer: React.FC<ControllerContainerProps> = ({
  keys,
  x,
  y,
  width,
  height,
  children,
  className = '',
  showMissingPropertyOverlay = false,
}) => {
  const primaryKey = keys?.[0] ?? '';

  // Call once
  const primary = useDeviceProperty(primaryKey || undefined);

  const {
    deviceId,
    propertyPath,
    isEditable,
    schemaAttrs,
    proxyStatus,
    isOffline,
    propertyStatus,
  } = primary;

  const propertyMissing = propertyStatus === PropertyStatus.MISSING;

  const disabledReason = React.useMemo(() => {
    if (!primaryKey) return 'No property specified';

    if (!deviceId || !propertyPath) {
      return 'Invalid property key';
    }

    if (proxyStatus === ProxyStatus.OFFLINE || isOffline) {
      return 'Device offline';
    }

    if (propertyMissing) {
      return 'Property missing in device schema/config';
    }

    if (schemaAttrs?.accessMode === AccessMode.ReadOnly) {
      return 'Property is read-only and cannot be edited from the GUI';
    }

    if (schemaAttrs?.accessMode === AccessMode.InitOnly) {
      return 'Property is InitOnly and can only be configured in the device run file';
    }

    if (schemaAttrs?.requiredAccessLevel !== undefined && !isEditable) {
      return `Requires access level ${schemaAttrs.requiredAccessLevel} or higher`;
    }

    if (!isEditable) {
      return 'Property is not editable in the current context';
    }

    return undefined;
  }, [
    primaryKey,
    deviceId,
    propertyPath,
    proxyStatus,
    isOffline,
    propertyMissing,
    schemaAttrs,
    isEditable,
  ]);

  const canEdit =
    !!primaryKey &&
    !!deviceId &&
    !!propertyPath &&
    !propertyMissing &&
    !isOffline &&
    isEditable;

  const isEnabled = canEdit;
  const tooltipText = disabledReason || primaryKey;

  const hasPendingEdits = false;

  const ctx: ControllerContainerContext = {
    canEdit,
    isEnabled,
    disabledReason,
    tooltipText,
    proxyStatus,
    propertyMissing,
    hasPendingEdits,
    primary,
  };

  const content = typeof children === 'function' ? children(ctx) : children;

  return (
    <div
      className={`absolute ${className}`.trim()}
      style={{ left: x, top: y, width, height }}
    >
      {content}

      <PropertyOverlay
        primary={primary}
        x={0}
        y={0}
        width={width}
        height={height}
        showMissingPropertyOverlay={showMissingPropertyOverlay}
      />
    </div>
  );
};
