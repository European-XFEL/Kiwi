/**
 * DisplayCommand - controller component
 */

import * as React from 'react';
import type { DisplayCommandProps } from '@/scene/scene_types/controllers';
import { Button } from '@/components/ui/button';
import { FONT_FAMILY_DEFAULT } from '@/components/shared/helpers/fontDefaults';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { AccessLevel } from '@/karabo_data/SchemaEnums';
import { ProxyStatus } from '@/device/enums';

const DisplayCommand: React.FC<DisplayCommandProps> = ({
  font_size,
  font_weight,
  requires_confirmation,
  allowedStates,
  tooltipText,
  primary,
}) => {
  const deviceId = primary?.deviceId;
  const propertyPath = primary?.propertyPath;
  const descriptor = primary?.descriptor;
  const proxyStatus = primary?.proxyStatus;
  const deviceState = primary?.deviceState;
  const schemaAttrs = primary?.schemaAttrs;
  const isOffline = primary?.isOffline;

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
    return primary?.propertyIndicator?.label ?? '';
  }, [
    descriptor?.displayedName,
    propertyPath,
    primary?.propertyIndicator?.label,
  ]);

  // ─────────────────────────────────────────
  // Final enablement
  // ─────────────────────────────────────────
  const isEnabled =
    hasCommandPermission && isDeviceOnline && stateAllowsCommand;

  const disabledReason = React.useMemo(() => {
    if (!deviceId) return 'No device selected for this command';

    if (!isDeviceOnline) {
      if (proxyStatus === ProxyStatus.UNKNOWN) {
        return 'Device status is still initializing';
      }
      return 'Device offline – command cannot be executed';
    }

    if (!hasCommandPermission) {
      const required = schemaAttrs?.requiredAccessLevel ?? AccessLevel.Operator;
      return `Requires access level ${AccessLevel[required]} or higher`;
    }

    if (!stateAllowsCommand) {
      return 'Command not allowed in current device state';
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
    <Button
      size="sm"
      disabled={!isEnabled}
      aria-label={disabledReason || `Command: ${buttonCaption}`}
      title={tooltipText || disabledReason}
      className={`w-full h-full border-2 px-2 ${
        isEnabled
          ? 'border-primary bg-primary hover:bg-primary/90 cursor-pointer'
          : 'border-gray-300 bg-gray-400 cursor-not-allowed opacity-60'
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

export default DisplayCommand;
