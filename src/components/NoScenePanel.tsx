import React from "react";
import { useNavigate } from "react-router-dom";
import { RecentSceneModel } from "../view_models/RecentScenesModel";
import { useGlobalStore } from "../store/globalAppStateStore";
import useRecentStore from "../store/recentScenesStore";
import RecentScenesList from "./scene/RecentScenesList";
import BookmarkInfo from "./info/BookmarkInfo";
import { Separator } from "./ui/separator";

const NoScenePanel: React.FC = () => {
  const { sessionInfo } = useGlobalStore();
  const { getRecentScenesForUser, removeRecentScene } = useRecentStore();
  const navigate = useNavigate();

  document.title = "Kiwi";

  const loggedUser = sessionInfo?.loggedUser ?? null;
  const userScenes: RecentSceneModel[] = loggedUser
    ? getRecentScenesForUser(loggedUser)
    : [];

  const handleSceneClick = (recentScene: RecentSceneModel) => {
    navigate(
      `/scene?host=${sessionInfo!.guiServerHost}` +
        `&port=${sessionInfo!.guiServerPort}` +
        `&domain=${encodeURIComponent(recentScene.domain)}` +
        `&projectName=${encodeURIComponent(recentScene.projectName)}` +
        `&uuid=${encodeURIComponent(recentScene.uuid)}`,
      { replace: true }
    );
  };

  const handleRemoveScene = (recentScene: RecentSceneModel) => {
    if (loggedUser) {
      removeRecentScene(loggedUser, {
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
          scenes={userScenes}
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

export default NoScenePanel;
