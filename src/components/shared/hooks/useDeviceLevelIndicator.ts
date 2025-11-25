import React from "react";
import { splitKaraboKeys } from "@/components/shared/helpers/splitKaraboKeys";
import { useDeviceStatus } from "@/store/useDeviceStatusStore";
import { DeviceOverlayIndicator } from "@/overlay_indicator/device_overlay_indicator";
import type { DeviceIndicatorDescriptor } from "@/overlay_indicator/types";

export function useDeviceLevelIndicator(
  karaboKeys: string
): DeviceIndicatorDescriptor | null {
  const { deviceId } = React.useMemo(
    () => splitKaraboKeys(karaboKeys),
    [karaboKeys]
  );

  const deviceStatus = useDeviceStatus(deviceId);
  if (!deviceStatus) return null;

  return DeviceOverlayIndicator.compute_device_overlay_indicator(deviceStatus);
}
