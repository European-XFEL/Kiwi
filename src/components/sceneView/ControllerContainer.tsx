import React, { useMemo } from "react";
import DeviceOverlay from "./overlays/DeviceOverlay";
import PropertyOverlay from "./overlays/PropertyOverlay";

import { useKaraboPropertyInfo } from "../shared/hooks/useKaraboProperty";
import { useKaraboKeysString } from "../shared/hooks/useKaraboKeysString";
import { usePropertyPermissions } from "../shared/hooks/usePropertyPermission";
import {
  ControllerPermissionsContext,
  type ControllerPermissionsContext as IControllerPermissionsContext,
} from "../shared/hooks/useControllerPermissions";

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
 * ControllerContainer
 *
 * Centralized wrapper for all controller widgets. Handles:
 *  - Absolute positioning
 *  - Device-level overlays (offline, startup phases)
 *  - Property-level overlay ("??" when property missing)
 *  - Permissions (reactive to schema, access level, device state)
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
  const joinedKeys = useKaraboKeysString(keys);
  const { deviceId, propertyId } = useKaraboPropertyInfo(joinedKeys);

  // Get permissions from PropertyPermissionsStore (reactive!)
  // Automatically updates when schema/access level/device state changes
  const permissions = usePropertyPermissions(deviceId, propertyId);

  console.log(
    `[ControllerContainer] Permissions for ${deviceId}/${propertyId}:`,
    `canEdit=${permissions.canEdit}, reason="${permissions.disabledReason}"`
  );

  const permissionsValue: IControllerPermissionsContext = useMemo(
    () => ({
      canEdit: permissions.canEdit,
      disabledReason: permissions.disabledReason,
    }),
    [permissions.canEdit, permissions.disabledReason]
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

        {/* Property-level overlay ("??") – only for property-based widgets */}
        {showMissingPropertyOverlay && (
          <PropertyOverlay
            keys={keys}
            x={0}
            y={0}
            width={width}
            height={height}
          />
        )}

        {/* Device-level overlay (offline + startup phases) */}
        <DeviceOverlay keys={keys} x={0} y={0} width={width} height={height} />
      </div>
    </ControllerPermissionsContext.Provider>
  );
};
