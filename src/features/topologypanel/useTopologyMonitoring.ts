import { useCallback, type RefObject } from 'react';
import type { TreeApi } from 'react-arborist';
import { useKaraboEvent, KaraboEvent } from '@/lib/events';
import type { SystemTree, SystemTreeNode } from '@/lib/topology/SystemTree';

type MonitoringEvent = { device_id: string };

export default function useTopologyMonitoring(
  tree: RefObject<TreeApi<SystemTreeNode> | null>,
  model: SystemTree
): void {
  const updateMonitoring = useCallback(
    (deviceId: string, monitoring: boolean) => {
      const node =
        tree.current?.get(deviceId)?.data ?? model.getInstanceNode(deviceId);
      node?.setMonitoring(monitoring);
    },
    [tree, model]
  );

  useKaraboEvent(
    KaraboEvent.StartMonitoringDevice,
    ({ device_id }: MonitoringEvent) => updateMonitoring(device_id, true)
  );
  useKaraboEvent(
    KaraboEvent.StopMonitoringDevice,
    ({ device_id }: MonitoringEvent) => updateMonitoring(device_id, false)
  );
}
