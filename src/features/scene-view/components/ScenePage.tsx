import React from 'react';
import { ScenePanel } from '@/features/scenepanel/api';
import { useGlobalStore, useLoadedSceneStore } from '@/store/api';
import { useSceneLoader } from '../hooks/useSceneLoader';
import {
  SceneFatalError,
  SceneLoadError,
  SceneLoading,
} from './SceneStatusViews';

const ScenePage: React.FC = () => {
  const { lastGlobalError } = useGlobalStore();
  const loadedSceneRef = useLoadedSceneStore((state) => state.loadedSceneRef);
  const { scene, error } = useSceneLoader();

  if (!scene) {
    return error ? <SceneLoadError message={error} /> : <SceneLoading />;
  }

  if (lastGlobalError) {
    return <SceneFatalError message={lastGlobalError} />;
  }

  if (!loadedSceneRef || loadedSceneRef.uuid !== scene.uuid) {
    return <SceneLoading />;
  }

  return <ScenePanel sceneRef={loadedSceneRef} sceneModel={scene} />;
};

export default ScenePage;
