import React from "react";
import { splitKaraboKeys } from "@/components/shared/helpers/splitKaraboKeys";
import { useDeviceProxy } from "@/store/useDeviceProxyStore";
import type { DeviceIndicatorDescriptor } from "@/device/device-proxy/types";

export function useDeviceLevelIndicator(
  karaboKeys: string
): DeviceIndicatorDescriptor | null {
  const { deviceId } = React.useMemo(
    () => splitKaraboKeys(karaboKeys),
    [karaboKeys]
  );

  const proxy = useDeviceProxy(deviceId);

  if (!proxy) return null;

  return proxy.getIndicatorDescriptor();
}
