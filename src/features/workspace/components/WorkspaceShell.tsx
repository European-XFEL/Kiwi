import { ScenePanel, type ScenePanelContent } from '@/features/scenepanel/api';
import { SceneOpenError } from '@/features/scene-view/components/SceneStatusViews';
import { ProjectLoading } from '@/features/project/api';
import { getPanelWrangler } from '@/lib/singletons/api';
import {
  HOME_TAB_ID,
  type SceneTabContent,
} from '@/lib/singletons/PanelWrangler';
import HomePanel from '@/app/HomePanel';
import { useEffect, useState } from 'react';
import type { PanelTab, WorkspaceModel, WorkspaceRuntime } from '../types';
import WorkspaceBody from './WorkspaceBody';
import WorkspaceFooter from './WorkspaceFooter';
import WorkspaceHeader from './WorkspaceHeader';

// TODO: renderLeftPanel — Topology panel (device/instance tree)

// A tab's content is renderable as a scene only once all three loaded fields
// are present; missing content is an error, not another scene load.
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

function renderCenterPanel(tab: PanelTab, isPageVisible: boolean) {
  if (tab.id === HOME_TAB_ID) {
    return <HomePanel />;
  }
  if (!isPageVisible) return null;

  const content = getPanelWrangler().getContent(tab.id);
  const snapshot = getPanelWrangler().getSceneTab(tab.id);
  if (content?.error) return <SceneOpenError message={content.error} />;
  if (!isLoadedSceneContent(content))
    return (
      <SceneOpenError message="The scene is unavailable. Try opening it again." />
    );
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
        {runtime.projectLoading ? (
          <ProjectLoading />
        ) : (
          <WorkspaceBody
            body={workspace.body}
            renderLeftPanel={() => null}
            renderCenterPanel={(tab) => renderCenterPanel(tab, isPageVisible)}
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
        )}
      </div>

      <WorkspaceFooter footer={workspace.footer} runtime={runtime} />
    </section>
  );
}
