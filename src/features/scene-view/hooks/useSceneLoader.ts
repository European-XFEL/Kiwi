/**
 * useSceneLoader — loads and parses the scene referenced in the current URL.
 *
 * Handles: URL param extraction, DB connector call, topology readiness poll,
 * recent-scenes registration, and document title update.
 *
 * Returns { scene, error } — SceneView only has to render.
 */

import type { SceneModel } from '@/karabo/common/scenemodel/api';
import type { LoadProjectSceneResult } from '@/karabo/common/project/api';
import { sceneParamsFromURL } from '@/features/navigation/utils';
import { getDbConn, getTopology } from '@/lib/singletons/api';
import {
  type TopicRecentSceneInfo,
  useRecentStore,
  useGlobalStore,
  useLoadedSceneStore,
} from '@/store/api';
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
  const { setLoadedSceneRef } = useLoadedSceneStore();

  const topic = sessionInfo?.guiServerTopic;

  const [scene, setScene] = React.useState<SceneModel | null>(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const sceneParams = sceneParamsFromURL(location.search);
    if (!sceneParams) return;
    const currentSceneParams = sceneParams;

    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | null = null;

    const clearPoll = () => {
      if (poll) {
        clearInterval(poll);
        poll = null;
      }
    };

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
      currentSceneParams.domain,
      currentSceneParams.projectName,
      currentSceneParams.uuid,
      (result: LoadProjectSceneResult) => {
        if (cancelled) return;

        if (result.error_msg) {
          setLoadedSceneRef(undefined);
          setError(
            `Couldn't retrieve scene data.\nPlease check Project Database availability.\nDetails: ${result.error_msg}`
          );
          setScene(null);
          document.title = 'Kiwi';
          return;
        }

        const model = result.model!;
        setLoadedSceneRef({
          width: model.width,
          height: model.height,
          domain: result.scene!.domain,
          projectName: result.scene!.projectName,
          uuid: result.scene!.uuid,
          name: result.scene!.name,
        });

        if (topic) {
          const recentScene: TopicRecentSceneInfo = {
            topic,
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
  }, [location.search, topic, setLoadedSceneRef, setRecentScene]);

  return { scene, error };
}
