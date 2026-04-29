import React from 'react';
import { DeviceProxy, ProxyStatus } from '@/lib/binding/api';
import { getTopology } from '@/lib/singletons/api';

export interface UseDeviceRootResult {
  root: DeviceProxy | undefined;
  deviceId: string | undefined;
  deviceState: string | undefined;
  proxyStatus: ProxyStatus;
  isOffline: boolean;
}

type DeviceRootState = {
  deviceId: string | undefined;
  deviceState: string | undefined;
  proxyStatus: ProxyStatus;
};

const snapshotRoot = (
  root: DeviceProxy | undefined,
  deviceId: string | undefined
): DeviceRootState => ({
  deviceId,
  deviceState: root?.state,
  proxyStatus: root?.status ?? ProxyStatus.OFFLINE,
});

const sameRootState = (a: DeviceRootState, b: DeviceRootState) =>
  a.deviceId === b.deviceId &&
  a.deviceState === b.deviceState &&
  a.proxyStatus === b.proxyStatus;

export default function useDeviceRoot(
  deviceId: string | undefined
): UseDeviceRootResult {
  const root = React.useMemo(
    () => (deviceId ? getTopology().getDevice(deviceId) : undefined),
    [deviceId]
  );
  const ownerRef = React.useRef({});
  const [rootState, setRootState] = React.useState<DeviceRootState>(() =>
    snapshotRoot(root, deviceId)
  );
  const currentRootState =
    rootState.deviceId === deviceId ? rootState : snapshotRoot(root, deviceId);

  React.useEffect(() => {
    const nextState = snapshotRoot(root, deviceId);

    if (!root) {
      setRootState((prev) =>
        sameRootState(prev, nextState) ? prev : nextState
      );
      return;
    }

    setRootState((prev) => (sameRootState(prev, nextState) ? prev : nextState));

    const syncDeviceState = () => {
      const updated = snapshotRoot(root, deviceId);
      setRootState((prev) => {
        return sameRootState(prev, updated) ? prev : updated;
      });
    };

    const stopMonitoring = root.addMonitor();
    const unsubscribeState = root.state_update.subscribe(
      ownerRef.current,
      syncDeviceState
    );
    const unsubscribeStatus = root.status_update.subscribe(
      ownerRef.current,
      syncDeviceState
    );

    return () => {
      stopMonitoring();
      unsubscribeState();
      unsubscribeStatus();
    };
  }, [deviceId, root]);

  return React.useMemo(
    () => ({
      root,
      deviceId,
      deviceState: currentRootState.deviceState,
      proxyStatus: currentRootState.proxyStatus,
      isOffline: currentRootState.proxyStatus === ProxyStatus.OFFLINE,
    }),
    [currentRootState.deviceState, currentRootState.proxyStatus, deviceId, root]
  );
}
