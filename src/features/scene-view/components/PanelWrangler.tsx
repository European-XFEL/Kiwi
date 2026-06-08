import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ScenePanel } from '@/features/scenepanel/api';
import { useActiveScene } from '../hooks/useActiveScene';
import { SceneOpenError, ScenePending } from './SceneStatusViews';

type SceneTab = {
  id: string;
  title: string;
  path: string;
};

function getNextActiveTab(
  tabs: SceneTab[],
  closingId: string,
  currentActiveId: string | null
): SceneTab | null {
  const remaining = tabs.filter((tab) => tab.id !== closingId);
  if (remaining.length === 0) return null;

  if (currentActiveId !== closingId) {
    return remaining.find((tab) => tab.id === currentActiveId) ?? remaining[0];
  }

  const closingIndex = tabs.findIndex((tab) => tab.id === closingId);
  const fallbackIndex = Math.min(closingIndex, remaining.length - 1);
  return remaining[fallbackIndex] ?? null;
}

const PanelWrangler: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { scene, error, sceneParams, loadedSceneRef } = useActiveScene();

  const [tabs, setTabs] = React.useState<SceneTab[]>([]);

  const currentPath = `${location.pathname}${location.search}`;

  const currentSceneTab = React.useMemo<SceneTab | null>(() => {
    if (!sceneParams) return null;

    return {
      id: `scene:${sceneParams.uuid}`,
      title: loadedSceneRef?.name
        ? `${loadedSceneRef.name}`
        : `${sceneParams.uuid.slice(0, 8)}`,
      path: currentPath,
    };
  }, [sceneParams, loadedSceneRef?.name, currentPath]);

  React.useEffect(() => {
    if (!currentSceneTab) return;

    setTabs((prev) => {
      const index = prev.findIndex((tab) => tab.id === currentSceneTab.id);

      if (index === -1) {
        return [...prev, currentSceneTab];
      }

      const existing = prev[index];
      if (
        existing.title === currentSceneTab.title &&
        existing.path === currentSceneTab.path
      ) {
        return prev;
      }

      const next = [...prev];
      next[index] = currentSceneTab;
      return next;
    });
  }, [currentSceneTab]);

  const activeTabId = currentSceneTab?.id ?? null;
  const activeTab = activeTabId
    ? (tabs.find((tab) => tab.id === activeTabId) ?? null)
    : null;

  const handleTabSelect = React.useCallback(
    (tab: SceneTab) => {
      if (tab.path !== currentPath) {
        navigate(tab.path);
      }
    },
    [navigate, currentPath]
  );

  const handleTabClose = React.useCallback(
    (tabId: string) => {
      const isClosingActive = tabId === activeTabId;
      const nextActive = isClosingActive
        ? getNextActiveTab(tabs, tabId, activeTabId)
        : null;

      setTabs((prev) => prev.filter((tab) => tab.id !== tabId));

      if (isClosingActive) {
        navigate(nextActive?.path ?? '/home');
      }
    },
    [tabs, activeTabId, navigate]
  );

  let content: React.ReactNode;
  if (!sceneParams) {
    content = (
      <SceneOpenError message="No scene selected. Open a scene from the landing page." />
    );
  } else if (!scene) {
    content = error ? <SceneOpenError message={error} /> : <ScenePending />;
  } else if (!loadedSceneRef || loadedSceneRef.uuid !== scene.uuid) {
    content = <ScenePending />;
  } else {
    content = <ScenePanel sceneRef={loadedSceneRef} sceneModel={scene} />;
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border bg-background shadow-sm">
      <div
        role="tablist"
        aria-label="Scene tabs"
        className="flex min-h-9 items-end gap-1 border-b bg-muted/40 px-2 pt-2"
      >
        {tabs.map((tab) => {
          const selected = tab.id === activeTab?.id;

          return (
            <div
              key={tab.id}
              role="presentation"
              className={[
                'inline-flex items-center rounded-t-md border border-b-0',
                selected
                  ? 'bg-background'
                  : 'bg-muted/60 text-muted-foreground',
              ].join(' ')}
            >
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => handleTabSelect(tab)}
                className="px-3 py-1 text-sm font-medium"
              >
                {tab.title}
              </button>

              <button
                type="button"
                aria-label={`Close ${tab.title}`}
                onClick={() => handleTabClose(tab.id)}
                className="mr-1 rounded-sm px-1 text-xs leading-none hover:bg-muted-foreground/20"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <div
        role="tabpanel"
        aria-label={activeTab?.title ?? 'Scene'}
        className="min-h-0 flex-1"
      >
        {content}
      </div>
    </section>
  );
};

export default PanelWrangler;
