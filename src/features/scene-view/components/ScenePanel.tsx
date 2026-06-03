import { SceneModel } from '@/karabo/common/api';
import { LoadedSceneRef } from '@/store/api';
import React from 'react';
import SceneView from './SceneView';

export interface ScenePanelProps {
  sceneRef: LoadedSceneRef;
  sceneModel: SceneModel;
}

const ScenePanel: React.FC<ScenePanelProps> = ({ sceneRef, sceneModel }) => {
  void sceneRef;
  return <SceneView sceneModel={sceneModel} />;
};

export default ScenePanel;
