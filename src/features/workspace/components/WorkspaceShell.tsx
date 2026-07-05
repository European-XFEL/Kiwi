import { ScenePanel } from '@/features/scenepanel/api';
import {
  SceneOpenError,
  ScenePending,
} from '@/features/scene-view/components/SceneStatusViews';
import { getPanelWrangler } from '@/lib/singletons/api';
import { HOME_TAB_ID } from '@/lib/singletons/PanelWrangler';
import HomePanel from '@/app/HomePanel';
import { useActiveSceneStore } from '@/features/scene-view/hooks/useActiveScene';
import type { PanelTab, WorkspaceModel, WorkspaceRuntime } from '../types';
import WorkspaceBody from './WorkspaceBody';
import WorkspaceFooter from './WorkspaceFooter';
import WorkspaceHeader from './WorkspaceHeader';

// TODO: renderLeftPanel — Topology panel (device/instance tree)

function renderCenterPanel(tab: PanelTab, isSceneLoadPending = false) {
  if (tab.id === HOME_TAB_ID) {
    return isSceneLoadPending ? <ScenePending /> : <HomePanel />;
  }
  const content = getPanelWrangler().getContent(tab.id);
  if (content?.error) return <SceneOpenError message={content.error} />;
  if (!content?.sceneRef || !content?.sceneModel) return <ScenePending />;
  return (
    <ScenePanel sceneRef={content.sceneRef} sceneModel={content.sceneModel} />
  );
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

  return (
    <section className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background">
      {workspace.header.visible ? (
        <WorkspaceHeader header={workspace.header} runtime={runtime} />
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        <WorkspaceBody
          body={workspace.body}
          renderLeftPanel={() => null}
          renderCenterPanel={(tab) =>
            renderCenterPanel(tab, isSceneLoadPending)
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
