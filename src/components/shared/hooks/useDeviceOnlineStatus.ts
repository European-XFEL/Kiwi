import { useCallback, useEffect, useState } from "react";
import { TopologyConnector } from "@/karabo_connectors/TopologyConnector";
import { DeviceInfo, TopologyEventType } from "@/karabo_data/TopologyInfo";

/**
 * Hook to monitor device online/offline status
 *
 * @param deviceId - The device ID to monitor
 * @returns isOffline - true if device is offline/gone, false if online
 *
 * @example
 * const isOffline = useDeviceOnlineStatus(deviceId);
 *
 * return (
 *   <div>
 *     {isOffline ? <OfflineOverlay /> : <Content />}
 *   </div>
 * );
 */
export function useDeviceOnlineStatus(deviceId: string): boolean {
  const [isOffline, setIsOffline] = useState<boolean>(
    !TopologyConnector.inst.isDeviceOnline(deviceId)
  );

  const onDeviceInfoUpdate = useCallback(
    (eventType: TopologyEventType, deviceInfo: DeviceInfo) => {
      if (deviceInfo.deviceId !== deviceId) {
        console.error(
          `Topology update routing error: monitor for ${deviceId} received update for ${deviceInfo.deviceId}!`
        );
        return;
      }
      setIsOffline(eventType === TopologyEventType.GONE);
    },
    [deviceId]
  );

  useEffect(() => {
    TopologyConnector.inst.registerDeviceInfoMonitor(
      deviceId,
      onDeviceInfoUpdate
    );

    return () => {
      TopologyConnector.inst.unregisterDeviceInfoMonitor(
        deviceId,
        onDeviceInfoUpdate
      );
    };
  }, [deviceId, onDeviceInfoUpdate]);

  return isOffline;
}
