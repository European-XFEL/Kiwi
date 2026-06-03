/**
 * DisplayCommand — executes a device command on click.
 *
 * Enabled/disabled is driven by device state via binding.is_allowed().
 * This gives automatic start/stop toggle: a "Start" button's binding only
 * allows the command when the device is STOPPED, and vice versa for "Stop".
 */

import React from 'react';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { DisplayCommandModel } from '@/karabo/common/api';
import { useGlobalStore } from '@/store/api';
import { AccessLevel } from '@/karabo/data/api';
import { ProxyStatus } from '@/lib/binding/api';
import { getNetwork } from '@/lib/singletons/api';
import { getControllerFontStyle } from '../../utils/fonts';
import { CommandButton } from '@/components/api';

// DisplayCommand
// ----------------------------------------------------------------------------

const DisplayCommand: React.FC<{
  model: DisplayCommandModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const deviceId = ctx?.proxy?.root.deviceId;
  const propertyPath = ctx?.proxy?.path;
  const proxyStatus = ctx?.proxy?.root.status ?? ProxyStatus.OFFLINE;
  const deviceState = ctx?.proxy?.root.state;
  const binding = ctx?.proxy?.binding;

  const userAccessLevel = useGlobalStore(
    (s) => s.sessionInfo?.accessLevel ?? AccessLevel.OBSERVER
  );

  const requiredAccessLevel =
    binding?.requiredAccessLevel ?? AccessLevel.OPERATOR;
  const hasCommandPermission = userAccessLevel >= requiredAccessLevel;

  const isDeviceOnline = proxyStatus !== ProxyStatus.OFFLINE;

  // Core start/stop logic — binding.is_allowed() knows which states permit this command
  const stateAllowsCommand =
    !!deviceId &&
    deviceState != null &&
    (binding?.is_allowed?.(deviceState) ?? false);

  const buttonCaption = binding?.displayedName ?? propertyPath ?? '';

  const isEnabled =
    hasCommandPermission && isDeviceOnline && stateAllowsCommand;

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
      style={getControllerFontStyle(model.font_size, model.font_weight)}
      onClick={onSubmitCommand}
    >
      {model.requires_confirmation
        ? `${buttonCaption} (Confirm)`
        : buttonCaption}
    </CommandButton>
  );
};

export default DisplayCommand;
