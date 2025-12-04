import React, { useMemo } from "react";
import { PropertyOverlay } from "./overlays/PropertyOverlay";
import {
  ControllerPermissionsContext,
  type ControllerPermissionsContext as IControllerPermissionsContext,
} from "../shared/hooks/useControllerPermissions";
import { useDeviceProperty } from "../shared/hooks/useDeviceProperty";
import { AccessMode } from "@/karabo_data/SchemaEnums";
import { ProxyStatus } from "@/device/enums";

export interface ControllerContainerProps {
  /** Karabo keys array for device/property identification */
  keys: string[];
  /** Absolute X position on canvas */
  x: number;
  /** Absolute Y position on canvas */
  y: number;
  /** Widget width */
  width: number;
  /** Widget height */
  height: number;
  /** Widget content to be wrapped */
  children: React.ReactNode;
  /** Optional additional CSS class for the wrapper */
  className?: string;
  /** Whether this widget depends on a property (show "??" overlay when missing) */
  showMissingPropertyOverlay?: boolean;
}

/**
 * ControllerContainer (v2)
 *
 * Centralized wrapper for all controller widgets. Now powered by `useDeviceProperty`.
 * Handles:
 *  - Absolute positioning
 *  - Device-level overlay via proxyStatus (offline + status dot)
 *  - Property-level overlay ("??" when property missing)
 *  - Permissions (isEditable + disabledReason) via ControllerPermissionsContext
 */
export const ControllerContainer: React.FC<ControllerContainerProps> = ({
  keys,
  x,
  y,
  width,
  height,
  children,
  className = "",
  showMissingPropertyOverlay = false,
}) => {
  // Pick the primary key for this widget (usually the first)
  const primaryKey = keys[0] ?? "";

  const { deviceId, propertyPath, isEditable, schemaAttrs, proxyStatus } =
    useDeviceProperty(primaryKey);

  // Build a human-readable disabledReason
  const disabledReason = useMemo(() => {
    if (!deviceId || !propertyPath) {
      return "No property specified";
    }

    if (proxyStatus === ProxyStatus.OFFLINE) {
      return "Device offline";
    }

    if (!schemaAttrs) {
      return "Property missing in device schema/config";
    }

    if (isEditable) return "";

    // Basic heuristics from schema
    if (schemaAttrs.accessMode === AccessMode.ReadOnly) {
      return "Property is read-only and cannot be edited from the GUI";
    }
    if (schemaAttrs.accessMode === AccessMode.InitOnly) {
      return "Property is InitOnly and can only be configured in the device run file";
    }

    if (schemaAttrs.requiredAccessLevel !== undefined) {
      return `Requires access level ${schemaAttrs.requiredAccessLevel} or higher`;
    }

    return "Property is not editable in the current context";
  }, [deviceId, propertyPath, isEditable, schemaAttrs, proxyStatus]);

  const permissionsValue: IControllerPermissionsContext = useMemo(
    () => ({
      canEdit: isEditable,
      disabledReason,
    }),
    [isEditable, disabledReason]
  );

  return (
    <ControllerPermissionsContext.Provider value={permissionsValue}>
      <div
        className={`absolute ${className}`.trim()}
        style={{
          left: x,
          top: y,
          width,
          height,
        }}
      >
        {/* Actual widget content */}
        {children}

        {/* Unified overlay (device + property) */}
        <PropertyOverlay
          karaboKeys={primaryKey}
          x={0}
          y={0}
          width={width}
          height={height}
          showMissingPropertyOverlay={showMissingPropertyOverlay}
        />
      </div>
    </ControllerPermissionsContext.Provider>
  );
};
