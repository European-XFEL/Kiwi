import { useApplicationModeStore } from '@/store/api';
import { CinemaBootstrap } from '@/features/cinema/components/api';
import { useState } from 'react';
import WorkspaceShell from './components/WorkspaceShell';
import SceneBootstrap from './components/SceneBootstrap';
import useWorkspaceRuntime from './hooks/useWorkspaceRuntime';
import { createDefaultWorkspaceModel } from './utils';
import type { WorkspaceModel } from './types';

export default function WorkspacePage() {
  const mode = useApplicationModeStore((state) => state.mode);
  const [workspace] = useState<WorkspaceModel>(() =>
    createDefaultWorkspaceModel(mode)
  );
  const runtime = useWorkspaceRuntime();

  return (
    <>
      {mode === 'cinema' ? <CinemaBootstrap /> : <SceneBootstrap />}
      <WorkspaceShell workspace={workspace} runtime={runtime} />
    </>
  );
}
