import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RecentSceneInfo, useRecentStore, useGlobalStore } from '@/store/api';
import { RecentScenesList } from '@/features/project/api';
import { Separator } from '@/components/api';
import BookmarkInfo from '@/app/components/BookmarkInfo';

const LandingPage: React.FC = () => {
  const { sessionInfo } = useGlobalStore();
  const { getRecentScenesForTopic, removeRecentScene } = useRecentStore();
  const navigate = useNavigate();

  document.title = 'Kiwi';

  const topic = sessionInfo?.guiServerTopic ?? null;
  const recentScenes: RecentSceneInfo[] = topic
    ? getRecentScenesForTopic(topic)
    : [];

  const handleSceneClick = (recentScene: RecentSceneInfo) => {
    navigate(
      `/scene?host=${sessionInfo!.guiServerHost}` +
        `&port=${sessionInfo!.guiServerPort}` +
        `&domain=${encodeURIComponent(recentScene.domain)}` +
        `&projectName=${encodeURIComponent(recentScene.projectName)}` +
        `&uuid=${encodeURIComponent(recentScene.uuid)}`,
      { replace: true }
    );
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
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Kiwi</h1>
          <p className="text-muted-foreground">
            View Karabo scenes in the browser
          </p>
        </div>

        <Separator />

        <RecentScenesList
          scenes={recentScenes}
          onSceneOpen={handleSceneClick}
          onSceneRemove={handleRemoveScene}
          disabled={!sessionInfo}
        />

        <BookmarkInfo />
      </div>
    </div>
  );
};

export default LandingPage;
