import * as React from 'react';
import type { DisplayCommandProps } from '@/scene/scene_types/controllers';
import { Button } from '@/components/ui/button';
import { FONT_FAMILY_DEFAULT } from '../utils/fontDefaults';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { AccessLevel } from '@/karabo/data/enums';
import { ProxyStatus } from '@/lib/binding/ProxyStatus';
import { getNetwork } from '@/singletons/api';

const DisplayCommand: React.FC<DisplayCommandProps> = ({
  font_size,
  font_weight,
  requires_confirmation,
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

  const requiredAccessLevel =
    binding?.requiredAccessLevel ?? AccessLevel.OPERATOR;

  const hasCommandPermission = userAccessLevel >= requiredAccessLevel;

  const isDeviceOnline =
    proxyStatus !== ProxyStatus.OFFLINE && isOffline !== true;

  const stateAllowsCommand =
    !!deviceId && // check empty string
    deviceState != null && // both undefined + null
    (binding?.is_allowed?.(deviceState) ?? false);

  const buttonCaption =
    binding?.displayedName ??
    propertyPath ??
    primary?.propertyIndicator?.label ??
    '';

  const isEnabled =
    hasCommandPermission && isDeviceOnline && stateAllowsCommand;

  const disabledReason = React.useMemo(() => {
    if (!deviceId) return 'No device selected for this command';

    if (!isDeviceOnline) {
      return `Device ${deviceId} is offline`;
    }

    if (!hasCommandPermission) {
      return `Requires access level ${AccessLevel[requiredAccessLevel]} or higher`;
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
    requiredAccessLevel,
    stateAllowsCommand,
  ]);

  const onSubmitCommand = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();

      if (!deviceId || !propertyPath) return;

      if (requires_confirmation) {
        const confirmed = window.confirm(
          `Are you sure you want to execute "${buttonCaption}"?`
        );
        if (!confirmed) return;
      }

      getNetwork().onExecute(deviceId, propertyPath);
    },
    [deviceId, propertyPath, requires_confirmation, buttonCaption]
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
      title={tooltipText || disabledReason}
      className={`${baseClasses} ${isEnabled ? enabledClasses : disabledClasses}`}
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
