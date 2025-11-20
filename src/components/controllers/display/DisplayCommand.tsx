import React from "react";
import type { DisplayCommandProps } from "@/scene/scene_types/controllers";
import { useKaraboPropertyInfo } from "../../shared/hooks/useKaraboProperty";
import { useDeviceOnlineStatus } from "../../shared/hooks/useDeviceOnlineStatus";
import { useKaraboKeysString } from "../../shared/hooks/useKaraboKeysString";
import { useAccessLevel } from "../../shared/hooks/useAccessLevel";
import { useDeviceState } from "../../shared/hooks/useDeviceState";
import { Button } from "@/components/ui/button";
import DeviceOfflineOverlay from "../../DeviceOfflineOverlay";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";
import type { PropertyInfoOptional } from "@/karabo_data/DeviceConfigInfo";
import { AccessLevel } from "@/karabo_data/SchemaEnums";
import { usePropertyPermissions } from "@/components/shared/hooks/usePropertyPermission";

/**
 * DisplayCommand
 *
 * Enabled when ALL are true:
 * 1. Device is online
 * 2. User has permission:
 *    - If property exists → use property.requiredAccessLevel + accessMode
 *    - If NO property → require Operator or higher
 * 3. Device state is in allowedStates (if specified)
 */
const DisplayCommand: React.FC<DisplayCommandProps> = ({
  keys,
  x,
  y,
  width,
  height,
  font_size,
  font_weight,
  requires_confirmation,
  allowedStates,
}) => {
  const keysStr = useKaraboKeysString(keys);
  const { deviceId, propertyId, property } = useKaraboPropertyInfo(keysStr);
  const isOffline = useDeviceOnlineStatus(deviceId);

  const { accessLevel } = useAccessLevel();
  const { isInState } = useDeviceState(deviceId);

  // Property (if any) – commands often have no schema
  const typedProperty = property as PropertyInfoOptional;

  // Property-based permissions (requiredAccessLevel + accessMode)
  const { canEdit: propertyCanEdit, disabledReason: propertyDisabledReason } =
    usePropertyPermissions(typedProperty);

  // Fallback rule when there is NO property/schema:
  // Only Operator and Expert can execute commands.
  const hasBasicCommandPermission = accessLevel >= AccessLevel.Operator;

  // Effective "can execute" permission:
  // - If we have a property → use property-based perms
  // - If no property → fall back to basic Operator/Expert rule
  const canExecute = typedProperty
    ? propertyCanEdit
    : hasBasicCommandPermission;

  // Device-state constraint (allowedStates from scene)
  const stateAllowsCommand = isInState(allowedStates);

  // Resolve button label from property schema or fallback to propertyId
  const buttonCaption = React.useMemo(() => {
    const name = typedProperty?.schemaAttrs?.displayedName;
    return name || propertyId;
  }, [typedProperty, propertyId]);

  // Final enabled flag
  const isEnabled = !isOffline && canExecute && stateAllowsCommand;

  // Build tooltip/aria-label explaining why button is disabled
  const finalDisabledReason = React.useMemo(() => {
    if (isOffline) {
      return "Device is offline";
    }

    if (!canExecute) {
      // Property-based case: reuse hook's explanation
      if (typedProperty && propertyDisabledReason) {
        return propertyDisabledReason;
      }

      // No property: we know we require at least Operator
      if (!hasBasicCommandPermission) {
        return `Requires access level ${AccessLevel[AccessLevel.Operator]}`;
      }

      return "Insufficient permissions to execute this command";
    }

    if (!stateAllowsCommand) {
      return "Command not allowed in current device state";
    }

    return undefined;
  }, [
    isOffline,
    canExecute,
    typedProperty,
    propertyDisabledReason,
    hasBasicCommandPermission,
    stateAllowsCommand,
  ]);

  // Render offline overlay if device is disconnected
  if (isOffline) {
    return (
      <DeviceOfflineOverlay
        keys={keys}
        x={x}
        y={y}
        width={width}
        height={height}
      />
    );
  }

  return (
    <Button
      size="sm"
      disabled={!isEnabled}
      aria-label={finalDisabledReason || `Command: ${buttonCaption}`}
      title={finalDisabledReason}
      className={`absolute border-2 px-2 ${
        isEnabled
          ? "border-primary bg-primary hover:bg-primary/90 cursor-pointer"
          : "border-gray-300 bg-gray-400 cursor-not-allowed opacity-60"
      }`}
      style={{
        left: x,
        top: y,
        width,
        height,
        fontFamily: FONT_FAMILY_DEFAULT,
        fontSize: font_size,
        fontWeight: font_weight,
      }}
    >
      {requires_confirmation ? `${buttonCaption} (Confirm)` : buttonCaption}
    </Button>
  );
};

export default DisplayCommand;
