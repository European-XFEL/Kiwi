/**
 * DisplayCommand — executes a device command on click.
 *
 * Enabled/disabled is driven by device state via binding.is_allowed().
 * This gives automatic start/stop toggle: a "Start" button's binding only
 * allows the command when the device is STOPPED, and vice versa for "Stop".
 */

import React from 'react';
import type { ControllerContainerContext } from '../ControllerContainer';
import { DisplayCommandModel } from '@/karabo/common/api';
import { registerRenderer } from '@/features/scene-view/registry';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { AccessLevel } from '@/karabo/data/api';
import { ProxyStatus } from '@/lib/binding/api';
import { getNetwork } from '@/lib/singletons/api';
import { getControllerFontStyle } from '../../utils/fonts';
import CommandButton from '@/components/CommandButton';

// DisplayCommand
// ----------------------------------------------------------------------------

const DisplayCommand: React.FC<{
  model: DisplayCommandModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const deviceId = ctx?.primary?.deviceId;
  const propertyPath = ctx?.primary?.propertyPath;
  const proxyStatus = ctx?.primary?.proxyStatus;
  const deviceState = ctx?.primary?.deviceState;
  const isOffline = ctx?.primary?.isOffline;
  const binding = ctx?.primary?.binding;

  const userAccessLevel = useGlobalStore(
    (s) => s.sessionInfo?.accessLevel ?? AccessLevel.OBSERVER
  );

  const requiredAccessLevel =
    binding?.requiredAccessLevel ?? AccessLevel.OPERATOR;
  const hasCommandPermission = userAccessLevel >= requiredAccessLevel;

  const isDeviceOnline =
    proxyStatus !== ProxyStatus.OFFLINE && isOffline !== true;

  // Core start/stop logic — binding.is_allowed() knows which states permit this command
  const stateAllowsCommand =
    !!deviceId &&
    deviceState != null &&
    (binding?.is_allowed?.(deviceState) ?? false);

  const buttonCaption =
    binding?.displayedName ??
    propertyPath ??
    ctx?.primary?.propertyIndicator?.label ??
    '';

  const isEnabled =
    hasCommandPermission && isDeviceOnline && stateAllowsCommand;

  const disabledReason = React.useMemo(() => {
    if (!ctx) return 'No device binding';
    if (!deviceId) return 'No device selected for this command';
    if (!isDeviceOnline) return `Device ${deviceId} is offline`;
    if (!hasCommandPermission)
      return `Requires access level ${AccessLevel[requiredAccessLevel]} or higher`;
    if (!stateAllowsCommand)
      return 'Command not allowed in current device state';
    return undefined;
  }, [
    ctx,
    deviceId,
    isDeviceOnline,
    hasCommandPermission,
    requiredAccessLevel,
    stateAllowsCommand,
  ]);

  const onSubmitCommand = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (!deviceId || !propertyPath) return;

      if (model.requires_confirmation) {
        const confirmed = window.confirm(
          `Are you sure you want to execute "${buttonCaption}"?`
        );
        if (!confirmed) return;
      }

      getNetwork().onExecute(deviceId, propertyPath);
    },
    [deviceId, propertyPath, model.requires_confirmation, buttonCaption]
  );

  return (
    <CommandButton
      width={model.width}
      height={model.height}
      disabled={!isEnabled}
      ariaLabel={`Command: ${buttonCaption}`}
      title={ctx?.tooltipText || disabledReason}
      style={getControllerFontStyle(model.font_size, model.font_weight)}
      onClick={onSubmitCommand}
    >
      {model.requires_confirmation
        ? `${buttonCaption} (Confirm)`
        : buttonCaption}
    </CommandButton>
  );
};

registerRenderer('DisplayCommand', DisplayCommand);

export default DisplayCommand;
