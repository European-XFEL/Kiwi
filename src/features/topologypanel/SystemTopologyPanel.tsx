import { useState } from 'react';
import { Button } from '@/components/api';
import { getTopology } from '@/lib/singletons/api';
import SystemTopologyTree from './SystemTopologyTree';
import SystemTopologySearchBar from './SystemTopologySearchBar';
import { openServiceManager } from './utils';

export default function SystemTopologyPanel() {
  const topology = getTopology();
  const [applied, setApplied] = useState<{
    text: string;
    revision: number;
    action: 'apply' | 'clear';
  }>({ text: '', revision: 0, action: 'apply' });
  return (
    <div className="flex h-full min-h-0 flex-col items-start">
      <SystemTopologySearchBar
        applied={applied.text}
        onFilterChange={(text) => {
          setApplied((current) => ({
            text,
            revision: current.revision + 1,
            action: 'apply',
          }));
        }}
        onClear={() => {
          setApplied((current) => ({
            text: '',
            revision: current.revision + 1,
            action: 'clear',
          }));
        }}
      />
      <Button
        className="w-full"
        variant="outline"
        size="sm"
        onClick={openServiceManager}
      >
        Service Manager
      </Button>
      <SystemTopologyTree
        model={topology.systemTree}
        filter={applied.text}
        filterRevision={applied.revision}
        filterAction={applied.action}
      />
    </div>
  );
}
