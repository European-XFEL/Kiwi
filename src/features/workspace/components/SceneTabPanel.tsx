import { memo, useCallback, useSyncExternalStore } from 'react';
import {
  ScenePanel,
  type ScenePanelContent,
  type ScenePanelProps,
} from '@/features/scenepanel/api';
import { SceneOpenError } from '@/features/scene-view/components/SceneStatusViews';
import { getPanelWrangler } from '@/lib/singletons/api';
import type { SceneTabContent } from '@/lib/singletons/PanelWrangler';

interface SceneTabPanelProps {
  tabId: string;
  showProjectNavigation: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

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

function SceneTabPanel({
  tabId,
  showProjectNavigation,
  isFullscreen,
  onToggleFullscreen,
}: SceneTabPanelProps) {
  const wrangler = getPanelWrangler();
  const getContent = useCallback(
    () => wrangler.getContent(tabId),
    [tabId, wrangler]
  );
  const getIsUnattachedScene = useCallback(
    () => wrangler.getSceneTab(tabId)?.isUnattachedScene === true,
    [tabId, wrangler]
  );
  const content = useSyncExternalStore(wrangler.subscribe, getContent);
  const isUnattachedScene = useSyncExternalStore(
    wrangler.subscribe,
    getIsUnattachedScene
  );
  const onFitModeChange = useCallback<ScenePanelProps['onFitModeChange']>(
    (mode) => wrangler.setFitMode(tabId, mode),
    [tabId, wrangler]
  );

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
      content={{ ...content, isUnattachedScene }}
      onFitModeChange={onFitModeChange}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
    />
  );
}

export default memo(SceneTabPanel);
