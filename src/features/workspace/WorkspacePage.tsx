import { useState } from 'react';
import WorkspaceShell from './components/WorkspaceShell';
import SceneBootstrap from './components/SceneBootstrap';
import useWorkspaceRuntime from './hooks/useWorkspaceRuntime';
import { createDefaultWorkspaceModel } from './utils';
import type { WorkspaceModel } from './types';

export default function WorkspacePage() {
  const [workspace] = useState<WorkspaceModel>(() =>
    createDefaultWorkspaceModel()
  );
  const runtime = useWorkspaceRuntime();

  return (
    <>
      <SceneBootstrap />
      <WorkspaceShell workspace={workspace} runtime={runtime} />
    </>
  );
}
