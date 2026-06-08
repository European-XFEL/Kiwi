import { SceneModel } from '@/karabo/common/api';
import {
  getOverflow,
  SceneView,
  useActiveSceneStore,
  useSceneScale,
} from '@/features/scene-view/api';
import { LoadedSceneRef } from '@/store/api';
import React from 'react';
import ScenePanelShell from './ScenePanelShell';
import ScenePanelViewport from './ScenePanelViewport';
import SceneToolBar from './SceneToolBar';

export interface ScenePanelProps {
  sceneRef: LoadedSceneRef;
  sceneModel: SceneModel;
}

const ScenePanel: React.FC<ScenePanelProps> = ({ sceneRef, sceneModel }) => {
  const fitMode = useActiveSceneStore((state) => state.fitMode);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const sceneDimensions = React.useMemo(
    () => ({ width: sceneModel.width, height: sceneModel.height }),
    [sceneModel.width, sceneModel.height]
  );
  const scale = useSceneScale(containerRef, sceneDimensions, fitMode);
  const { overflowX, overflowY } = React.useMemo(
    () => getOverflow(fitMode),
    [fitMode]
  );

  return (
    <ScenePanelShell
      header={
        <SceneToolBar
          width={sceneRef.width}
          height={sceneRef.height}
          scale={scale}
        />
      }
      viewport={
        <ScenePanelViewport
          containerRef={containerRef}
          style={{ overflowX, overflowY }}
        >
          <SceneView sceneModel={sceneModel} scale={scale} fitMode={fitMode} />
        </ScenePanelViewport>
      }
    />
  );
};

export default ScenePanel;
