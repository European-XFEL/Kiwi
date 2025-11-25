import React from "react";
import type { DisplayCommandProps } from "@/scene/scene_types/controllers";
import { useKaraboPropertyInfo } from "../../shared/hooks/useKaraboProperty";
import { useKaraboKeysString } from "../../shared/hooks/useKaraboKeysString";
import { useAccessLevel } from "../../shared/hooks/useAccessLevel";
import { useDeviceState } from "../../shared/hooks/useDeviceState";
import { Button } from "@/components/ui/button";
import {
  ControllerContainer,
  useControllerPermissions,
} from "@/components/sceneView/ControllerContainer";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";
import type { PropertyInfoOptional } from "@/karabo_data/DeviceConfigInfo";
import { AccessLevel } from "@/karabo_data/SchemaEnums";

/**
 * DisplayCommand - Command button widget for executing device commands.
 *
 * Permission logic (handled by ControllerContainer + command-specific checks):
 * - Device must be online (ControllerContainer)
 * - Property permissions checked (ControllerContainer)
 * - Access level must be at least Operator (command-specific)
 * - Device state must allow command execution (command-specific)
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

  // Get basic permission state from ControllerContainer
  const { canEdit: propertyCanEdit, disabledReason: propertyDisabledReason } =
    useControllerPermissions();

  const { accessLevel } = useAccessLevel();
  const { isInState } = useDeviceState(deviceId);

  const typedProperty = property as PropertyInfoOptional;

  // Commands require Operator level or higher
  const hasBasicCommandPermission = accessLevel >= AccessLevel.Operator;

  // If property exists, use property permissions; otherwise use access level
  const canExecute = typedProperty
    ? propertyCanEdit
    : hasBasicCommandPermission;

  // Check if device state allows this command
  const stateAllowsCommand = isInState(allowedStates);

  const buttonCaption = React.useMemo(() => {
    const name = typedProperty?.schemaAttrs?.displayedName;
    return name || propertyId;
  }, [typedProperty, propertyId]);

  // Final enabled state: must pass property/access check AND state check
  const isEnabled = canExecute && stateAllowsCommand;

  const finalDisabledReason = React.useMemo(() => {
    // If property-based permission failed, use that reason
    if (typedProperty && !propertyCanEdit && propertyDisabledReason) {
      return propertyDisabledReason;
    }

    // If no property and access level is insufficient
    if (!typedProperty && !hasBasicCommandPermission) {
      return `Requires access level ${AccessLevel[AccessLevel.Operator]}`;
    }

    // If state doesn't allow command
    if (!stateAllowsCommand) {
      return "Command not allowed in current device state";
    }

    return undefined;
  }, [
    canExecute,
    typedProperty,
    propertyCanEdit,
    propertyDisabledReason,
    hasBasicCommandPermission,
    stateAllowsCommand,
  ]);

  return (
    <ControllerContainer
      keys={keys}
      x={x}
      y={y}
      width={width}
      height={height}
      className="absolute"
      checkPermissions
      showPropertyOverlay
    >
      <Button
        size="sm"
        disabled={!isEnabled}
        aria-label={finalDisabledReason || `Command: ${buttonCaption}`}
        title={finalDisabledReason}
        className={`w-full h-full border-2 px-2 ${
          isEnabled
            ? "border-primary bg-primary hover:bg-primary/90 cursor-pointer"
            : "border-gray-300 bg-gray-400 cursor-not-allowed opacity-60"
        }`}
        style={{
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: font_size,
          fontWeight: font_weight,
        }}
      >
        {requires_confirmation ? `${buttonCaption} (Confirm)` : buttonCaption}
      </Button>
    </ControllerContainer>
  );
};

export default DisplayCommand;
