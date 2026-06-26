import React from 'react';
import { RecentSceneInfo, useRecentStore, useGlobalStore } from '@/store/api';
import { RecentScenesList } from '@/features/project/api';
import BookmarkInfo from './components/BookmarkInfo';
import { Separator } from '@/components/api';
import { Hash } from '@/karabo/data/hash';
import { broadcast_event, KaraboEvent } from '@/lib/events';

const HomePanel: React.FC = () => {
  const { sessionInfo } = useGlobalStore();
  const { getRecentScenesForTopic, removeRecentScene } = useRecentStore();

  React.useEffect(() => {
    document.title = 'Kiwi';
  }, []);

  const topic = sessionInfo?.guiServerTopic ?? null;
  const recentScenes: RecentSceneInfo[] = topic
    ? getRecentScenesForTopic(topic)
    : [];

  const handleSceneClick = (recentScene: RecentSceneInfo) => {
    if (!sessionInfo) return;

    const hash = new Hash();
    hash.set('uuid', recentScene.uuid);
    hash.set('domain', recentScene.domain);
    hash.set('project', recentScene.projectName);
    hash.set('name', recentScene.name);
    broadcast_event(KaraboEvent.OpenScene, hash);
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
    <div className="flex justify-center min-h-full p-4">
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

        {/* Bookmark Info */}
        <BookmarkInfo />
      </div>
    </div>
  );
};

export default HomePanel;
