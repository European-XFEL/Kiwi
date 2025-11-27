import React from "react";
import type { DisplayCommandProps } from "@/scene/scene_types/controllers";
import { useKaraboPropertyInfo } from "../../shared/hooks/useKaraboProperty";
import { useKaraboKeysString } from "../../shared/hooks/useKaraboKeysString";
import { useAccessLevel } from "../../shared/hooks/useAccessLevel";
import { useDeviceState } from "../../shared/hooks/useDeviceState";
import { Button } from "@/components/ui/button";
import { ControllerContainer } from "@/components/sceneView/ControllerContainer";
import { useControllerPermissions } from "@/components/shared/hooks/useControllerPermissions";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";
import type { PropertyInfoOptional } from "@/karabo_data/DeviceConfigInfo";
import { AccessLevel } from "@/karabo_data/SchemaEnums";

/**
 * Inner component: consumes permissions + access level + device state
 * and renders the actual button.
 */
const DisplayCommandInner: React.FC<{
  deviceId: string | undefined;
  propertyId: string | undefined;
  property: PropertyInfoOptional;
  font_size: number | string;
  font_weight: string;
  requires_confirmation: boolean;
  allowedStates?: string[];
}> = ({
  deviceId,
  propertyId,
  property,
  font_size,
  font_weight,
  requires_confirmation,
  allowedStates,
}) => {
  const { canEdit: propertyCanEdit, disabledReason: propertyDisabledReason } =
    useControllerPermissions();

  const { accessLevel } = useAccessLevel();

  // ✅ Safe string for the hook (hooks can't be conditional)
  const safeDeviceId = deviceId ?? "";
  const { isInState } = useDeviceState(safeDeviceId);

  const typedProperty = property as PropertyInfoOptional;

  // Commands require Operator level or higher
  const hasBasicCommandPermission = accessLevel >= AccessLevel.Operator;

  // If property exists, use property permissions; otherwise use access level
  const canExecute = typedProperty
    ? propertyCanEdit
    : hasBasicCommandPermission;

  // If no deviceId, we treat state as NOT allowing the command
  const stateAllowsCommand =
    !!deviceId && allowedStates ? isInState(allowedStates) : !!deviceId;

  const buttonCaption = React.useMemo(() => {
    const name = typedProperty?.schemaAttrs?.displayedName;
    return name || propertyId;
  }, [typedProperty, propertyId]);

  const isEnabled = canExecute && stateAllowsCommand;

  const finalDisabledReason = React.useMemo(() => {
    if (!deviceId) {
      return "No device selected for this command";
    }

    if (typedProperty && !propertyCanEdit && propertyDisabledReason) {
      return propertyDisabledReason;
    }

    if (!typedProperty && !hasBasicCommandPermission) {
      return `Requires access level ${AccessLevel[AccessLevel.Operator]}`;
    }

    if (!stateAllowsCommand) {
      return "Command not allowed in current device state";
    }

    return undefined;
  }, [
    deviceId,
    typedProperty,
    propertyCanEdit,
    propertyDisabledReason,
    hasBasicCommandPermission,
    stateAllowsCommand,
  ]);

  return (
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
  );
};

/**
 * Outer component: resolves keys → device/property and wraps with ControllerContainer.
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

  const typedProperty = property as PropertyInfoOptional;

  return (
    <ControllerContainer
      keys={keys}
      x={x}
      y={y}
      width={width}
      height={height}
      className="absolute"
      showMissingPropertyOverlay
    >
      <DisplayCommandInner
        deviceId={deviceId}
        propertyId={propertyId}
        property={typedProperty}
        font_size={font_size}
        font_weight={font_weight}
        requires_confirmation={requires_confirmation}
        allowedStates={allowedStates}
      />
    </ControllerContainer>
  );
};

export default DisplayCommand;
