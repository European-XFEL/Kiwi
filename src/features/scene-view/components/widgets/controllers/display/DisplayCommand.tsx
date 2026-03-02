/**
 * DisplayCommand — executes a device command on click.
 *
 * Enabled/disabled is driven by device state via binding.is_allowed().
 * This gives automatic start/stop toggle: a "Start" button's binding only
 * allows the command when the device is STOPPED, and vice versa for "Stop".
 */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/components/ControllerContainer';
import { DisplayCommandModel } from '@/karabo/common/models/widgets/controllers/display';
import { registerRenderer } from '@/features/scene-view/render/registry';
import { Button } from '@/components/button';
import { FONT_FAMILY_DEFAULT } from '@/karabo/common/utils/fontDefaults';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { AccessLevel } from '@/karabo/data/enums';
import { ProxyStatus } from '@/lib/binding/ProxyStatus';
import { getNetwork } from '@/singletons/api';

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

  const baseClasses = 'w-full h-full border-2 px-2';
  const enabledClasses =
    'border-primary bg-primary hover:bg-primary/90 cursor-pointer';
  const disabledClasses =
    'border-gray-300 bg-gray-400 cursor-not-allowed opacity-60';

  return (
    <Button
      size="sm"
      disabled={!isEnabled}
      aria-label={`Command: ${buttonCaption}`}
      title={ctx?.tooltipText || disabledReason}
      className={`${baseClasses} ${isEnabled ? enabledClasses : disabledClasses}`}
      style={{
        fontFamily: FONT_FAMILY_DEFAULT,
        fontSize: model.font_size,
        fontWeight: model.font_weight,
      }}
      onClick={onSubmitCommand}
    >
      {model.requires_confirmation
        ? `${buttonCaption} (Confirm)`
        : buttonCaption}
    </Button>
  );
};

registerRenderer('DisplayCommand', DisplayCommand);

export default DisplayCommand;
