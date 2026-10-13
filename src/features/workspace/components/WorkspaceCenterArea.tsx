import { memo, useRef } from 'react';
import {
  ScenePanel,
  useFullscreen,
  type ScenePanelContent,
  type ScenePanelProps,
} from '@/features/scenepanel/api';
import { SceneOpenError } from '@/features/scene-view/components/SceneStatusViews';
import { getPanelWrangler } from '@/lib/singletons/api';
import {
  HOME_TAB_ID,
  type SceneTabContent,
} from '@/lib/singletons/PanelWrangler';
import { CINEMA_TAB_ID } from '@/features/cinema/api';
import HomePanel from '@/app/HomePanel';
import type { PanelTab } from '../types';
import PanelContainer from './PanelContainer';

// A scene tab needs all its loaded fields before it can render.
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

function renderCenterPanel({
  tab,
  isVisible,
  showProjectNavigation,
  fullscreen,
}: {
  tab: PanelTab;
  isVisible: boolean;
  showProjectNavigation: boolean;
  fullscreen: Pick<ScenePanelProps, 'isFullscreen' | 'onToggleFullscreen'>;
}) {
  if (tab.id === CINEMA_TAB_ID) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No scene open
      </div>
    );
  }
  if (tab.id === HOME_TAB_ID) {
    return <HomePanel />;
  }
  if (!isVisible) {
    return null;
  }

  const wrangler = getPanelWrangler();
  const content = wrangler.getContent(tab.id);
  const snapshot = wrangler.getSceneTab(tab.id);
  if (content?.error) {
    return (
      <SceneOpenError
        message={content.error}
        showHomeAction={showProjectNavigation}
      />
    );
  }
  if (!isLoadedSceneContent(content)) {
    return (
      <SceneOpenError
        message="The scene is unavailable. Try opening it again."
        showHomeAction={showProjectNavigation}
      />
    );
  }
  return (
    <ScenePanel
      {...fullscreen}
      content={{
        ...content,
        isUnattachedScene: snapshot?.isUnattachedScene === true,
      }}
      onFitModeChange={(mode) => wrangler.setFitMode(tab.id, mode)}
    />
  );
}

function WorkspaceCenterArea({
  isVisible,
  showProjectNavigation = true,
}: {
  isVisible: boolean;
  showProjectNavigation?: boolean;
}) {
  const containerRef = useRef<HTMLElement | null>(null);
  const { isFullscreen, supported, toggle } = useFullscreen(containerRef);

  return (
    <PanelContainer
      area="center"
      containerRef={containerRef}
      renderPanel={(tab) =>
        renderCenterPanel({
          tab,
          isVisible,
          showProjectNavigation,
          fullscreen: {
            isFullscreen,
            onToggleFullscreen: supported ? toggle : undefined,
          },
        })
      }
      // The scene viewport owns its overflow and spacing.
      panelClassName="overflow-hidden"
      emptyState={
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium">No scene open</p>
          <p className="text-xs text-muted-foreground">
            Open a scene to start working.
          </p>
        </div>
      }
    />
  );
}

export default memo(WorkspaceCenterArea);
