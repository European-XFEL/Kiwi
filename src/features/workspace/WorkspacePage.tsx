import { useState, useSyncExternalStore } from 'react';
import WorkspaceShell from './components/WorkspaceShell';
import SceneBootstrap from './components/SceneBootstrap';
import useWorkspaceRuntime from './hooks/useWorkspaceRuntime';
import { createDefaultWorkspaceModel } from './utils';
import type { WorkspaceModel } from './types';
import { getPanelWrangler } from '@/lib/singletons/api';

export default function WorkspacePage() {
  const [workspace] = useState<WorkspaceModel>(() =>
    createDefaultWorkspaceModel()
  );
  const [panelWrangler] = useState(() => getPanelWrangler());
  const runtime = useWorkspaceRuntime();

  const panelState = useSyncExternalStore(
    panelWrangler.subscribe,
    panelWrangler.getSnapshot,
    panelWrangler.getSnapshot
  );
  return (
    <>
      <SceneBootstrap />
      <WorkspaceShell
        workspace={workspace}
        runtime={runtime}
        projectLoading={panelState.projectLoading}
      />
    </>
  );
}
