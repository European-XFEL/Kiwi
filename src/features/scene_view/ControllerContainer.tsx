import React from 'react';
import { PropertyOverlay } from './components/PropertyOverlay';
import { ProxyStatus, PropertyStatus } from '@/lib/binding';
import { useDeviceProperty, type UseDevicePropertyResult } from '@/lib/binding';

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
    if (propertyMissing) {
      return `${deviceId}.${propertyPath} missing from Schema`;
    }
    if (proxyStatus === ProxyStatus.OFFLINE) {
      return `${deviceId}.${propertyPath}`;
    }

    return undefined;
  }, [primaryKey, deviceId, propertyPath, propertyMissing]);

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
