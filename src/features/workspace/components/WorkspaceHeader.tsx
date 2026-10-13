import { NavBar } from '@/features/navigation';
import type { WorkspaceHeaderModel, WorkspaceRuntime } from '../types';

export default function WorkspaceHeader({
  header,
  runtime,
  showProjectNavigation = true,
}: {
  header: WorkspaceHeaderModel;
  runtime: WorkspaceRuntime;
  showProjectNavigation?: boolean;
}) {
  if (!header.visible || header.kind !== 'app-navbar') {
    return null;
  }

  return (
    <NavBar
      showProjectNavigation={showProjectNavigation}
      browser={runtime.browser}
      sceneOpen={runtime.sceneTabOpen ?? false}
      onGoHome={runtime.onGoToHomeTab}
      compact={header.density === 'compact'}
      projectLoading={
        showProjectNavigation && (runtime.projectLoading ?? false)
      }
      activity={runtime.activity}
      access={runtime.access}
      user={runtime.user}
    />
  );
}
