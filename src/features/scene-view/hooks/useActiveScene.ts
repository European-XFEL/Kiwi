import type { SceneModel } from '@/karabo/common/scenemodel/api';
import type { LoadProjectSceneResult } from '@/karabo/common/project/api';
import {
  sceneParamsFromURL,
  type SceneURLParams,
} from '@/features/navigation/utils';
import { getDbConn, getTopology } from '@/lib/singletons/api';
import {
  type TopicRecentSceneInfo,
  type LoadedSceneRef,
  useRecentStore,
  useGlobalStore,
} from '@/store/api';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { create } from 'zustand';
import type { FitMode } from './useSceneScale';

export interface ActiveSceneStore {
  loadedSceneRef?: LoadedSceneRef;
  setLoadedSceneRef: (loadedSceneRef?: LoadedSceneRef) => void;
  fitMode: FitMode;
  setFitMode: (mode: FitMode) => void;
}

export const useActiveSceneStore = create<ActiveSceneStore>((set) => ({
  loadedSceneRef: undefined,
  setLoadedSceneRef: (loadedSceneRef) =>
    set({ loadedSceneRef, fitMode: 'fit-page' }),
  fitMode: 'fit-page',
  setFitMode: (fitMode) => set({ fitMode }),
}));

export interface ActiveSceneResult {
  scene: SceneModel | null;
  error: string;
  sceneParams?: SceneURLParams;
  loadedSceneRef?: LoadedSceneRef;
}

function fetchScene(params: SceneURLParams): Promise<LoadProjectSceneResult> {
  return new Promise((resolve) => {
    getDbConn().getScene(
      params.domain,
      params.projectName,
      params.uuid,
      resolve
    );
  });
}

function waitForTopologyReady(
  isCancelled: () => boolean,
  intervalMs = 100
): Promise<boolean> {
  if (getTopology().initialized) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const poll = setInterval(() => {
      if (isCancelled()) {
        clearInterval(poll);
        resolve(false);
        return;
      }

      if (getTopology().initialized) {
        clearInterval(poll);
        resolve(true);
      }
    }, intervalMs);
  });
}

export function useActiveScene(): ActiveSceneResult {
  const location = useLocation();
  const { sessionInfo } = useGlobalStore();
  const { setRecentScene } = useRecentStore();

  const loadedSceneRef = useActiveSceneStore((state) => state.loadedSceneRef);
  const setLoadedSceneRef = useActiveSceneStore(
    (state) => state.setLoadedSceneRef
  );

  const topic = sessionInfo?.guiServerTopic;

  const sceneParams = React.useMemo(
    () => sceneParamsFromURL(location.search),
    [location.search]
  );

  const [scene, setScene] = React.useState<SceneModel | null>(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!sceneParams) {
      setScene(null);
      setError('');
      setLoadedSceneRef(undefined);
      return;
    }

    let cancelled = false;
    const isCancelled = () => cancelled;

    // Clear old state immediately so UI can enter a true pending state.
    setScene(null);
    setError('');
    setLoadedSceneRef(undefined);

    (async () => {
      const result = await fetchScene(sceneParams);
      if (isCancelled()) return;

      if (result.error_msg || !result.sceneModel) {
        setLoadedSceneRef(undefined);
        setScene(null);
        setError(
          `Couldn't retrieve scene data.\nPlease check Project Database availability.\nDetails: ${
            result.error_msg ?? 'Unknown error'
          }`
        );
        return;
      }

      const nextLoadedSceneRef: LoadedSceneRef = {
        width: result.sceneModel.width,
        height: result.sceneModel.height,
        domain: sceneParams.domain,
        projectName: sceneParams.projectName,
        uuid: result.sceneModel.uuid,
        name: result.sceneModel.simple_name,
      };

      setLoadedSceneRef(nextLoadedSceneRef);

      if (topic) {
        const recentScene: TopicRecentSceneInfo = {
          topic,
          domain: sceneParams.domain,
          uuid: result.sceneModel.uuid,
          name: result.sceneModel.simple_name,
          projectName: sceneParams.projectName,
        };
        setRecentScene(recentScene);
      }

      const topologyReady = await waitForTopologyReady(isCancelled);
      if (!topologyReady || isCancelled()) return;

      setScene(result.sceneModel);
      setError('');
    })();

    return () => {
      cancelled = true;
    };
  }, [sceneParams, topic, setLoadedSceneRef, setRecentScene]);

  React.useEffect(() => {
    document.title = loadedSceneRef
      ? `Kiwi [${loadedSceneRef.domain}:${loadedSceneRef.name}]`
      : 'Kiwi';
  }, [loadedSceneRef]);

  return { scene, error, sceneParams, loadedSceneRef };
}
