import { ScenePanel, type ScenePanelContent } from '@/features/scenepanel/api';
import {
  SceneOpenError,
  ScenePending,
} from '@/features/scene-view/components/SceneStatusViews';
import { getPanelWrangler } from '@/lib/singletons/api';
import {
  HOME_TAB_ID,
  type SceneTabContent,
} from '@/lib/singletons/PanelWrangler';
import HomePanel from '@/app/HomePanel';
import { useActiveSceneStore } from '@/features/scene-view/hooks/useActiveScene';
import { useEffect, useState } from 'react';
import type { PanelTab, WorkspaceModel, WorkspaceRuntime } from '../types';
import WorkspaceBody from './WorkspaceBody';
import WorkspaceFooter from './WorkspaceFooter';
import WorkspaceHeader from './WorkspaceHeader';

// TODO: renderLeftPanel — Topology panel (device/instance tree)

// A tab's content is renderable as a scene only once all three loaded fields
// are present; until then the panel shows a pending/error state instead.
function isLoadedSceneContent(
  content: SceneTabContent | undefined
): content is ScenePanelContent {
  return (
    content?.sceneRef !== undefined &&
    content.sceneModel !== undefined &&
    content.sceneControllerRegistry !== undefined &&
    content.fitMode !== undefined
  );
}

function renderCenterPanel(
  tab: PanelTab,
  isSceneLoadPending: boolean,
  isPageVisible: boolean
) {
  if (tab.id === HOME_TAB_ID) {
    return isSceneLoadPending ? <ScenePending /> : <HomePanel />;
  }
  if (!isPageVisible) return null;

  const content = getPanelWrangler().getContent(tab.id);
  const snapshot = getPanelWrangler().getSceneTab(tab.id);
  if (content?.error) return <SceneOpenError message={content.error} />;
  if (!isLoadedSceneContent(content)) return <ScenePending />;
  return (
    <ScenePanel
      content={{
        ...content,
        isUnattachedScene: snapshot?.isUnattachedScene === true,
      }}
      onFitModeChange={(mode) => getPanelWrangler().setFitMode(tab.id, mode)}
    />
  );
}

function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const updateVisibility = () => setIsVisible(!document.hidden);

    document.addEventListener('visibilitychange', updateVisibility);
    return () =>
      document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  return isVisible;
}

// TODO: renderRightPanel — Configurator panel (properties for selected device)

export default function WorkspaceShell({
  workspace,
  runtime,
}: {
  workspace: WorkspaceModel;
  runtime: WorkspaceRuntime;
}) {
  const isSceneLoadPending = useActiveSceneStore(
    (state) => state.sceneLoadPending
  );
  const isPageVisible = usePageVisibility();

  return (
    <section
      data-testid="workspace-shell"
      className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background"
    >
      {workspace.header.visible ? (
        <WorkspaceHeader header={workspace.header} runtime={runtime} />
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        <WorkspaceBody
          body={workspace.body}
          renderLeftPanel={() => null}
          renderCenterPanel={(tab) =>
            renderCenterPanel(tab, isSceneLoadPending, isPageVisible)
          }
          renderRightPanel={() => null}
          // The scene viewport owns its own overflow/layout, so skip the
          // generic tab-panel overflow-auto/padding to avoid nested scroll.
          centerPanelClassName="overflow-hidden"
          centerEmptyState={
            <div className="space-y-2 text-center">
              <p className="text-sm font-medium">No scene open</p>
              <p className="text-xs text-muted-foreground">
                Open a scene to start working.
              </p>
            </div>
          }
        />
      </div>

      <WorkspaceFooter footer={workspace.footer} runtime={runtime} />
    </section>
  );
}
