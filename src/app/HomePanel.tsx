import React from 'react';
import { Separator } from '@/components/api';
import {
  ProjectFavoritesList,
  useProjectFavorites,
  loadRootProjectScene,
  removeProjectFavorite,
} from '@/features/project/api';
import type { StoredProjectFavorite } from '@/lib/singletons/api';
import { useGlobalStore } from '@/store/api';
import { appVersion } from './appVersion';

const HomePanel: React.FC = () => {
  const sessionInfo = useGlobalStore((state) => state.sessionInfo);
  const topic = sessionInfo?.guiServerTopic ?? '';
  const favorites = useProjectFavorites(topic);
  const [opening, setOpening] = React.useState(false);

  React.useEffect(() => {
    document.title = 'Kiwi';
  }, []);

  const handleOpen = (favorite: StoredProjectFavorite) => {
    if (!topic || opening) {
      return;
    }
    setOpening(true);
    // ProjectLoading replaces Home during the request. The action must keep
    // running after this component unmounts and reports its own errors.
    void loadRootProjectScene({
      domain: favorite.domain,
      projectUuid: favorite.projectUuid,
      sceneUuid: favorite.sceneUuid,
    })
      .promise.catch(() => {})
      .finally(() => setOpening(false));
  };

  const handleRemove = (favorite: StoredProjectFavorite) => {
    if (topic) {
      removeProjectFavorite(topic, favorite);
    }
  };

  return (
    <div
      data-testid="home-panel"
      className="flex h-full justify-center overflow-y-auto p-4"
    >
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">
            Kiwi &nbsp;
            <span className="text-sm tracking-tight font-normal">
              {appVersion}
            </span>
          </h1>
          <p className="text-muted-foreground">
            View Karabo scenes in the browser
          </p>
        </div>
        <Separator />
        <ProjectFavoritesList
          favorites={favorites}
          onOpen={handleOpen}
          onRemove={handleRemove}
          disabled={!topic || opening}
        />
      </div>
    </div>
  );
};

export default HomePanel;
