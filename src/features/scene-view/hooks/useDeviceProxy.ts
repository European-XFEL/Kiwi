import { useEffect, useRef, useState } from 'react';
import type { DeviceProxy } from '@/lib/binding/api';
import { getTopology } from '@/lib/singletons/api';

/** Subscribe to a cached device proxy without starting property monitoring. */
export function useDeviceProxy(deviceId: string): DeviceProxy | undefined {
  const ownerRef = useRef({});
  const [proxyState, setProxyState] = useState<{
    deviceId: string;
    proxy: DeviceProxy | undefined;
  }>({ deviceId, proxy: undefined });

  useEffect(() => {
    const proxy = deviceId ? getTopology().getDevice(deviceId) : undefined;
    const update = () => setProxyState({ deviceId, proxy });
    const stopOnline = proxy?.status_update.subscribe(ownerRef.current, update);
    const stopStatus = proxy?.instance_status_update.subscribe(
      ownerRef.current,
      update
    );
    update();

    return () => {
      stopOnline?.();
      stopStatus?.();
    };
  }, [deviceId]);

  return proxyState.deviceId === deviceId ? proxyState.proxy : undefined;
}
