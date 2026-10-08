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
import { AccessLevel } from '@/karabo/data/api';
import { PropertyProxy, ProxyStatus } from '@/lib/binding/api';
import { SlotBinding } from '@/lib/binding/BaseBinding';
import { getControllerFontStyle } from '../utils/fonts';
import { CommandButton } from '@/components/api';

function isCommandEnabled(
  proxy: PropertyProxy,
  userAccessLevel: AccessLevel
): boolean {
  const binding = proxy.binding;
  const state = proxy.root.state;
  return (
    binding instanceof SlotBinding &&
    !!proxy.root.deviceId &&
    !!proxy.path &&
    proxy.root.status !== ProxyStatus.OFFLINE &&
    !!state &&
    binding.is_allowed(state) &&
    userAccessLevel >= binding.requiredAccessLevel
  );
}

const DisplayCommand: React.FC<{
  model: DisplayCommandModel;
  ctx?: ControllerContainerContext;
}> = ({ model, ctx }) => {
  const userAccessLevel = ctx?.userAccessLevel ?? AccessLevel.OBSERVER;
  // XXX: find returns the first enabled proxy here
  const enabledProxy = ctx?.proxies.find((proxy) =>
    isCommandEnabled(proxy, userAccessLevel)
  );
  const proxy = enabledProxy ?? ctx?.proxies[0];
  const binding = proxy?.binding;
  let buttonCaption = 'NO TEXT';
  if (proxy && binding) {
    buttonCaption = binding.displayedName || proxy.path || 'NO TEXT';
  }
  const isEnabled = enabledProxy !== undefined;
  const setTooltip = ctx?.setTooltip;
  const tooltip = proxy?.key;
  React.useEffect(() => {
    setTooltip?.(tooltip);
    return () => setTooltip?.(undefined);
  }, [setTooltip, tooltip]);

  const onSubmitCommand = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (!proxy || !isEnabled) {
        return;
      }

      if (model.requires_confirmation) {
        const confirmed = window.confirm(
          `Are you sure you want to execute "${buttonCaption}"?`
        );
        if (!confirmed) {
          return;
        }
      }

      proxy.execute();
    },
    [proxy, isEnabled, model.requires_confirmation, buttonCaption]
  );

  return (
    <CommandButton
      width={model.width}
      height={model.height}
      disabled={!isEnabled}
      hasMultipleCommands={(ctx?.proxies.length ?? 0) > 1}
      data-testid="controller-command"
      ariaLabel={`Command: ${buttonCaption}`}
      style={{
        ...getControllerFontStyle(model.font_size, model.font_weight),
        ...(model.requires_confirmation && {
          fontWeight: 'bold',
          color: isEnabled ? 'rgb(255, 145, 255)' : undefined,
        }),
      }}
      onClick={onSubmitCommand}
    >
      {buttonCaption}
    </CommandButton>
  );
};

export default DisplayCommand;
