import { Button } from '@/components/api';
import { getTopology } from '@/lib/singletons/api';
import SystemTopologyTree from './SystemTopologyTree';
import { openServiceManager } from './utils';

export default function SystemTopologyPanel() {
  const topology = getTopology();
  return (
    <div className="flex h-full min-h-0 flex-col items-start">
      <Button
        className="w-full"
        variant="outline"
        size="sm"
        onClick={openServiceManager}
      >
        Service Manager
      </Button>
      <SystemTopologyTree model={topology.systemTree} />
    </div>
  );
}
