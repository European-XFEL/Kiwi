import { NavBar } from '@/features/navigation';
import type { WorkspaceHeaderModel, WorkspaceRuntime } from '../types';

export default function WorkspaceHeader({
  header,
  runtime,
}: {
  header: WorkspaceHeaderModel;
  runtime: WorkspaceRuntime;
}) {
  if (!header.visible || header.kind !== 'app-navbar') {
    return null;
  }

  return (
    <NavBar
      browser={runtime.browser}
      sceneOpen={runtime.sceneTabOpen ?? false}
      onGoHome={runtime.onGoToHomeTab}
      compact={header.density === 'compact'}
      projectLoading={runtime.projectLoading ?? false}
      activity={runtime.activity}
      access={runtime.access}
      user={runtime.user}
    />
  );
}
