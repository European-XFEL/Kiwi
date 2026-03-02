/**
 * useSceneLoader — loads and parses the scene referenced in the current URL.
 *
 * Handles: URL param extraction, DB connector call, topology readiness poll,
 * recent-scenes registration, and document title update.
 *
 * Returns { scene, error } — SceneView only has to render.
 */

import type { SceneModel } from '@/karabo/common/models/SceneModel';
import type { LoadProjectSceneResult } from '@/lib/ProjectDbInfo';
import { sceneParamsFromURL } from '@/features/navigation/utils';
import { getDbConn, getTopology } from '@/singletons/api';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { useLoadedSceneStore } from '@/store/loadedSceneStore';
import useRecentStore from '@/store/recentScenesStore';
import type { UserRecentSceneModel } from '@/view_models/RecentScenesModel';
import React from 'react';
import { useLocation } from 'react-router-dom';

export interface SceneLoaderResult {
  scene: SceneModel | null;
  error: string;
}

export function useSceneLoader(): SceneLoaderResult {
  const location = useLocation();
  const { sessionInfo } = useGlobalStore();
  const { setRecentScene } = useRecentStore();
  const { setScene: setLoadedScene } = useLoadedSceneStore();

  const loggedUser = sessionInfo?.loggedUser;

  const [scene, setScene] = React.useState<SceneModel | null>(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const sceneParams = sceneParamsFromURL(location.search);
    if (!sceneParams) return;
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | null = null;

    const clearPoll = () => {
      if (poll) {
        clearInterval(poll);
        poll = null;
      }
    };

    // Defer rendering until the topology is initialised.
    // Widgets need the device registry to be ready before subscribing.
    function applyWhenReady(model: SceneModel) {
      if (getTopology().initialized) {
        if (cancelled) return;
        setScene(model);
        setError('');
        return;
      }
      poll = setInterval(() => {
        if (getTopology().initialized) {
          clearPoll();
          if (cancelled) return;
          setScene(model);
          setError('');
        }
      }, 100);
    }

    getDbConn().getScene(
      sceneParams.domain,
      sceneParams.projectName,
      sceneParams.uuid,
      (result: LoadProjectSceneResult) => {
        if (cancelled) return;
        if (result.error_msg) {
          setError(
            `Couldn't retrieve scene data.\nPlease check Project Database availability.\nDetails: ${result.error_msg}`
          );
          setScene(null);
          document.title = 'Kiwi';
          return;
        }

        const model = result.model!;
        setLoadedScene({ width: model.width, height: model.height });

        if (loggedUser) {
          const recentScene: UserRecentSceneModel = {
            userId: loggedUser,
            domain: result.scene!.domain,
            uuid: result.scene!.uuid,
            name: result.scene!.name,
            projectName: result.scene!.projectName,
          };
          setRecentScene(recentScene);
        }

        document.title = `Kiwi [${result.scene!.domain}:${result.scene!.name}]`;
        applyWhenReady(model);
      }
    );

    return () => {
      cancelled = true;
      clearPoll();
    };
  }, [location.search, loggedUser, setLoadedScene, setRecentScene]);

  return { scene, error };
}
