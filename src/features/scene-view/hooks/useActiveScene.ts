import type { SceneModel } from '@/karabo/common/scenemodel/api';
import {
  sceneParamsFromURL,
  type SceneURLParams,
} from '@/features/navigation/utils';
import { findProjectModelInProject } from '@/karabo/common/project/api';
import { getDbConn, getProjectModel } from '@/lib/singletons/api';
import {
  type TopicRecentSceneInfo,
  type LoadedSceneRef,
  useRecentStore,
  useGlobalStore,
} from '@/store/api';
import { waitForTopology } from '@/lib/topology/api';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { create } from 'zustand';

// Holds the active scene's identity/metadata. Fit mode is NOT stored here: it is
// per-tab state owned by PanelWrangler's SceneTabContent so each tab keeps its
// own zoom-to-fit choice.
export interface ActiveSceneStore {
  loadedSceneRef?: LoadedSceneRef;
  setLoadedSceneRef: (loadedSceneRef?: LoadedSceneRef) => void;
  sceneLoadPending: boolean;
  setSceneLoadPending: (sceneLoadPending: boolean) => void;
}

export const useActiveSceneStore = create<ActiveSceneStore>((set) => ({
  loadedSceneRef: undefined,
  setLoadedSceneRef: (loadedSceneRef) => set({ loadedSceneRef }),
  sceneLoadPending: false,
  setSceneLoadPending: (sceneLoadPending) => set({ sceneLoadPending }),
}));

export interface ActiveSceneResult {
  scene: SceneModel | null;
  error: string;
  sceneParams?: SceneURLParams;
  loadedSceneRef?: LoadedSceneRef;
}

function fetchScene(params: SceneURLParams): SceneModel {
  return getDbConn().getScene(
    params.domain,
    params.projectUuid,
    params.sceneUuid
  );
}

export function useActiveScene(): ActiveSceneResult {
  const location = useLocation();
  const { sessionInfo } = useGlobalStore();
  const { setRecentScene } = useRecentStore();

  const loadedSceneRef = useActiveSceneStore((state) => state.loadedSceneRef);
  const setLoadedSceneRef = useActiveSceneStore(
    (state) => state.setLoadedSceneRef
  );
  const setSceneLoadPending = useActiveSceneStore(
    (state) => state.setSceneLoadPending
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
      setSceneLoadPending(false);
      return;
    }

    let cancelled = false;
    const isCancelled = () => cancelled;

    // Clear old state immediately so UI can enter a true pending state.
    setScene(null);
    setError('');
    setLoadedSceneRef(undefined);
    setSceneLoadPending(true);

    (async () => {
      try {
        const sceneModel = fetchScene(sceneParams);
        if (isCancelled()) return;

        const rootProject = getProjectModel().root;
        const projectName = rootProject
          ? (findProjectModelInProject(rootProject, sceneParams.projectUuid)
              ?.simple_name ?? rootProject.simple_name)
          : '';

        const nextLoadedSceneRef: LoadedSceneRef = {
          width: sceneModel.width,
          height: sceneModel.height,
          domain: sceneParams.domain,
          projectUuid: sceneParams.projectUuid,
          projectName,
          uuid: sceneModel.uuid,
          name: sceneModel.simple_name,
        };

        setLoadedSceneRef(nextLoadedSceneRef);

        if (topic && projectName) {
          const recentScene: TopicRecentSceneInfo = {
            topic,
            domain: sceneParams.domain,
            projectUuid: sceneParams.projectUuid,
            uuid: sceneModel.uuid,
            name: sceneModel.simple_name,
            projectName,
          };
          setRecentScene(recentScene);
        }

        const topologyReady = await waitForTopology(isCancelled);
        if (!topologyReady || isCancelled()) return;

        setScene(sceneModel);
        setError('');
      } catch (error) {
        if (isCancelled()) return;

        setLoadedSceneRef(undefined);
        setScene(null);
        setError(
          `Couldn't retrieve scene data.
Details: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      } finally {
        if (!isCancelled()) {
          setSceneLoadPending(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      setSceneLoadPending(false);
    };
  }, [
    sceneParams,
    topic,
    setLoadedSceneRef,
    setRecentScene,
    setSceneLoadPending,
  ]);

  React.useEffect(() => {
    document.title = loadedSceneRef
      ? `Kiwi [${loadedSceneRef.domain}:${loadedSceneRef.name}]`
      : 'Kiwi';
  }, [loadedSceneRef]);

  return { scene, error, sceneParams, loadedSceneRef };
}
