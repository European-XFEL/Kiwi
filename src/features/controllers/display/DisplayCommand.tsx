/**
 * DisplayCommand - controller component
 */

import * as React from 'react';
import type { DisplayCommandProps } from '@/scene/scene_types/controllers';
import { Button } from '@/components/ui/button';
import { FONT_FAMILY_DEFAULT } from '../utils/fontDefaults';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { AccessLevel } from '@/karabo-hash/enums';
import { ProxyStatus } from '@/lib/binding/ProxyStatus';
import { buildExecuteCommandHash } from '@/karabo_hash/builders/command_execution.ts';
import { getNetwork } from '@/singletons/api';

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
  const proxyStatus = primary?.proxyStatus;
  const deviceState = primary?.deviceState;
  const isOffline = primary?.isOffline;
  const binding = primary?.binding;

  const userAccessLevel = useGlobalStore(
    (s) => s.sessionInfo?.accessLevel ?? AccessLevel.OBSERVER
  );

  const hasCommandPermission = React.useMemo(() => {
    // Base rule: at least Operator
    if (userAccessLevel < AccessLevel.OPERATOR) return false;

    // Schema-level override if present
    if (binding?.requiredAccessLevel !== undefined) {
      return userAccessLevel >= binding.requiredAccessLevel;
    }

    return true;
  }, [userAccessLevel, binding?.requiredAccessLevel]);

  const isDeviceOnline = proxyStatus !== ProxyStatus.OFFLINE && !isOffline;

  const stateAllowsCommand = React.useMemo(() => {
    if (!deviceId) return false;
    if (!deviceState) return false;

    const isAllowed = binding?.is_allowed(deviceState);
    return isAllowed;
  }, [deviceId, deviceState, allowedStates, binding]);

  // ─────────────────────────────────────────
  // Caption / label
  // ─────────────────────────────────────────

  const buttonCaption = React.useMemo(() => {
    if (binding?.displayedName) return binding.displayedName;
    if (propertyPath) return propertyPath;
    return primary?.propertyIndicator?.label ?? '';
  }, [binding?.displayedName, propertyPath, primary?.propertyIndicator?.label]);

  const isEnabled =
    hasCommandPermission && isDeviceOnline && stateAllowsCommand;

  const disabledReason = React.useMemo(() => {
    if (!deviceId) return 'No device selected for this command';

    if (!isDeviceOnline) {
      if (proxyStatus === ProxyStatus.OFFLINE) {
        return 'Device status is still initializing';
      }
      return 'Device offline – command cannot be executed';
    }

    if (!hasCommandPermission) {
      const required = binding?.requiredAccessLevel ?? AccessLevel.OBSERVER;
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
    binding?.requiredAccessLevel,
    stateAllowsCommand,
  ]);

  // ─────────────────────────────────────────
  // Command submission
  // ─────────────────────────────────────────
  const onSubmitCommand = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (requires_confirmation) {
      const confirmed = window.confirm(
        `Are you sure you want to execute "${buttonCaption}"?`
      );
      if (!confirmed) return;
    }
    // TODO: Move to DeviceProxy
    const executeHash = buildExecuteCommandHash(deviceId!, propertyPath!);
    getNetwork().sendHash(executeHash);
  };

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
      onClick={onSubmitCommand}
    >
      {requires_confirmation ? `${buttonCaption} (Confirm)` : buttonCaption}
    </Button>
  );
};

export default DisplayCommand;
