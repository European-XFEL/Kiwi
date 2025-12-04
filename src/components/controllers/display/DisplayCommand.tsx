import * as React from "react";
import type { DisplayCommandProps } from "@/scene/scene_types/controllers";
import { Button } from "@/components/ui/button";
import { ControllerContainer } from "@/components/sceneView/ControllerContainer";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";
import { useDeviceProperty } from "@/components/shared/hooks/useDeviceProperty";
import { useGlobalStore } from "@/store/globalAppStateStore";
import { AccessLevel } from "@/karabo_data/SchemaEnums";
import { ProxyStatus } from "@/device/enums";

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
  const primaryKey = keys[0] ?? "";

  const {
    deviceId,
    propertyPath,
    descriptor,
    proxyStatus,
    deviceState,
    schemaAttrs,
    isReady,
    isOffline,
  } = useDeviceProperty(primaryKey);

  const userAccessLevel = useGlobalStore(
    (s) => s.sessionInfo?.accessLevel ?? AccessLevel.Observer
  );

  // ─────────────────────────────────────────
  // Permissions (AccessLevel)
  // ─────────────────────────────────────────
  const hasCommandPermission = React.useMemo(() => {
    // Base rule: at least Operator
    if (userAccessLevel < AccessLevel.Operator) return false;

    // Schema-level override if present
    if (schemaAttrs?.requiredAccessLevel !== undefined) {
      return userAccessLevel >= schemaAttrs.requiredAccessLevel;
    }

    return true;
  }, [userAccessLevel, schemaAttrs?.requiredAccessLevel]);

  // ─────────────────────────────────────────
  // Online / offline
  //   - OFFLINE → definitely not online
  //   - UNKNOWN → still initializing → treat as not online for commands
  // ─────────────────────────────────────────
  const isDeviceOnline =
    proxyStatus !== ProxyStatus.OFFLINE &&
    proxyStatus !== ProxyStatus.UNKNOWN &&
    !isOffline;

  // ─────────────────────────────────────────
  // ALLOWED_STATES (scene + schema)
  //   - if there is a restriction and we don't know deviceState yet,
  //     keep the command DISABLED
  // ─────────────────────────────────────────
  const stateAllowsCommand = React.useMemo(() => {
    if (!deviceId) return false;

    const sceneAllowedStates = allowedStates || [];
    const schemaAllowedStates = schemaAttrs?.allowedStates || [];
    const combinedAllowedStates = [
      ...sceneAllowedStates,
      ...schemaAllowedStates,
    ];

    // No allowedStates anywhere → no restriction
    if (combinedAllowedStates.length === 0) return true;

    // There *is* an ALLOWED_STATES list, but we don't know the state yet
    // → be conservative and *disallow* until state is known
    if (!deviceState) return false;

    const current = deviceState.trim().toUpperCase();
    const allowed = combinedAllowedStates.map((s) => s.trim().toUpperCase());
    return allowed.includes(current);
  }, [deviceId, deviceState, allowedStates, schemaAttrs?.allowedStates]);

  // ─────────────────────────────────────────
  // Caption / label
  // ─────────────────────────────────────────
  const buttonCaption = React.useMemo(() => {
    if (descriptor?.displayedName) return descriptor.displayedName;
    if (propertyPath) return propertyPath;
    return primaryKey;
  }, [descriptor?.displayedName, propertyPath, primaryKey]);

  // ─────────────────────────────────────────
  // Final enablement
  // ─────────────────────────────────────────
  const isEnabled =
    hasCommandPermission && isDeviceOnline && stateAllowsCommand;

  // Debug: see lifecycle of the command button
  React.useEffect(() => {
    console.log(`[DisplayCommand ${primaryKey}] Render state:`, {
      proxyStatus,
      proxyStatusLabel: ProxyStatus[proxyStatus],
      isReady,
      isOffline,
      isDeviceOnline,
      deviceState,
      deviceId,
      hasCommandPermission,
      stateAllowsCommand,
      isEnabled,
      schemaAttrs: schemaAttrs ? "present" : "undefined",
      userAccessLevel: AccessLevel[userAccessLevel],
    });
  }, [
    primaryKey,
    proxyStatus,
    isReady,
    isOffline,
    isDeviceOnline,
    deviceState,
    deviceId,
    hasCommandPermission,
    stateAllowsCommand,
    isEnabled,
    schemaAttrs,
    userAccessLevel,
  ]);

  const disabledReason = React.useMemo(() => {
    if (!deviceId) return "No device selected for this command";

    if (!isDeviceOnline) {
      if (proxyStatus === ProxyStatus.UNKNOWN) {
        return "Device status is still initializing";
      }
      return "Device offline – command cannot be executed";
    }

    if (!hasCommandPermission) {
      const required = schemaAttrs?.requiredAccessLevel ?? AccessLevel.Operator;
      return `Requires access level ${AccessLevel[required]} or higher`;
    }

    if (!stateAllowsCommand) {
      return "Command not allowed in current device state";
    }

    return undefined;
  }, [
    deviceId,
    isDeviceOnline,
    proxyStatus,
    hasCommandPermission,
    schemaAttrs?.requiredAccessLevel,
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
      showMissingPropertyOverlay={false}
    >
      <Button
        size="sm"
        disabled={!isEnabled}
        aria-label={disabledReason || `Command: ${buttonCaption}`}
        title={disabledReason}
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
