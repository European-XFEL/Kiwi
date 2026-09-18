import React from 'react';
import { RecentSceneInfo, useRecentStore, useGlobalStore } from '@/store/api';
import { RecentScenesList, loadRootProjectScene } from '@/features/project/api';
import type { RootProjectLoadHandle } from '@/features/project/api';
import { Separator } from '@/components/api';
import { useActiveSceneStore } from '@/features/scene-view/hooks/useActiveScene';

const HomePanel: React.FC = () => {
  const { sessionInfo } = useGlobalStore();
  const { getRecentScenesForTopic, removeRecentScene } = useRecentStore();
  const setSceneLoadPending = useActiveSceneStore(
    (state) => state.setSceneLoadPending
  );
  const sceneLoadHandleRef = React.useRef<RootProjectLoadHandle | null>(null);

  React.useEffect(() => {
    document.title = 'Kiwi';
  }, []);

  const topic = sessionInfo?.guiServerTopic ?? null;
  const recentScenes: RecentSceneInfo[] = topic
    ? getRecentScenesForTopic(topic)
    : [];

  const handleSceneClick = (recentScene: RecentSceneInfo) => {
    if (!sessionInfo) return;

    sceneLoadHandleRef.current?.abort();
    const handle = loadRootProjectScene({
      domain: recentScene.domain,
      projectUuid: recentScene.projectUuid,
      sceneUuid: recentScene.uuid,
    });
    sceneLoadHandleRef.current = handle;
    setSceneLoadPending(true);

    handle.promise
      .catch(() => {})
      .finally(() => {
        if (sceneLoadHandleRef.current === handle) {
          sceneLoadHandleRef.current = null;
        }

        if (!handle.controller.signal.aborted) {
          setSceneLoadPending(false);
        }
      });
  };

  const handleRemoveScene = (recentScene: RecentSceneInfo) => {
    if (topic) {
      removeRecentScene(topic, {
        domain: recentScene.domain,
        uuid: recentScene.uuid,
      });
    }
  };

  return (
    <div
      data-testid="home-panel"
      className="flex justify-center min-h-full p-4"
    >
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Kiwi</h1>
          <p className="text-muted-foreground">
            View Karabo scenes in the browser
          </p>
        </div>

        <Separator />

        {/* Recent Scenes */}
        <RecentScenesList
          scenes={recentScenes}
          onSceneOpen={handleSceneClick}
          onSceneRemove={handleRemoveScene}
          disabled={!sessionInfo}
        />
      </div>
    </div>
  );
};

export default HomePanel;
