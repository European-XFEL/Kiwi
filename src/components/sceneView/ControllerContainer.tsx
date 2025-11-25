import React, { createContext, useContext } from "react";
import DeviceOverlay from "./overlays/DeviceOverlay";
import PropertyOverlay from "./overlays/PropertyOverlay";

import { useKaraboPropertyInfo } from "../shared/hooks/useKaraboProperty";
import { useDeviceOnlineStatus } from "../shared/hooks/useDeviceOnlineStatus";
import { useKaraboKeysString } from "../shared/hooks/useKaraboKeysString";
import { usePropertyPermissions } from "../shared/hooks/usePropertyPermission";
import type { PropertyInfoOptional } from "@/karabo_data/DeviceConfigInfo";

/**
 * Context value for controller permissions and editability state
 */
interface ControllerPermissionsContext {
  /** Whether the widget can be edited (considers device online + user permissions) */
  canEdit: boolean;
  /** Human-readable reason why editing is disabled (if canEdit is false) */
  disabledReason?: string;
}

const ControllerPermissionsContext =
  createContext<ControllerPermissionsContext>({
    canEdit: true,
    disabledReason: undefined,
  });

/**
 * Hook to access controller permissions from within a widget
 * Only works for editable widgets wrapped in ControllerContainer with checkPermissions={true}
 */
export const useControllerPermissions = () => {
  return useContext(ControllerPermissionsContext);
};

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
  /** Whether to check permissions (only needed for editable widgets) */
  checkPermissions?: boolean;
  /** Whether this widget depends on a property (show "??" overlay when missing) */
  showPropertyOverlay?: boolean;
}

/**
 * ControllerContainer
 *
 * Handles:
 *  - absolute positioning
 *  - device offline / startup overlay (DeviceOverlay)
 *  - optional property-level overlay ("??" when missing)
 *  - centralized permission logic for editable widgets
 */
export const ControllerContainer: React.FC<ControllerContainerProps> = ({
  keys,
  x,
  y,
  width,
  height,
  children,
  className = "",
  checkPermissions = false,
  showPropertyOverlay = false,
}) => {
  const joinedKeys = useKaraboKeysString(keys);
  const { deviceId, property } = useKaraboPropertyInfo(joinedKeys);
  const offline = useDeviceOnlineStatus(deviceId);

  // Only check permissions if requested (for editable widgets)
  const { canEdit: hasPermission, disabledReason } = usePropertyPermissions(
    checkPermissions ? (property as PropertyInfoOptional) : null
  );

  const canEdit = !offline && hasPermission;

  const permissionsValue: ControllerPermissionsContext = {
    canEdit,
    disabledReason: !canEdit
      ? offline
        ? "Device offline"
        : disabledReason
      : undefined,
  };

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
        {showPropertyOverlay && (
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
