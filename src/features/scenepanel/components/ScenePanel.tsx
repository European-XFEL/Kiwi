import { SceneModel } from '@/karabo/common/api';
import {
  type FitMode,
  getOverflow,
  SceneControllerRegistryProvider,
  SceneView,
  useSceneScale,
} from '@/features/scene-view/api';
import { LoadedSceneRef } from '@/store/api';
import React from 'react';
import ScenePanelShell from './ScenePanelShell';
import ScenePanelViewport from './ScenePanelViewport';
import SceneToolBar from './SceneToolBar';
import type { SceneControllerRegistry } from '../SceneControllerRegistry';

export interface ScenePanelContent {
  sceneRef: LoadedSceneRef;
  sceneModel: SceneModel;
  sceneControllerRegistry: SceneControllerRegistry;
  fitMode: FitMode;
  isUnattachedScene?: boolean;
}

export interface ScenePanelProps {
  content: ScenePanelContent;
  onFitModeChange: (mode: FitMode) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const ScenePanel: React.FC<ScenePanelProps> = ({
  content,
  onFitModeChange,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const { sceneRef, sceneModel, sceneControllerRegistry, fitMode } = content;
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
          fitMode={fitMode}
          isUnattachedScene={content.isUnattachedScene}
          onFitModeChange={onFitModeChange}
          onApplyAll={() => sceneControllerRegistry.applyAll()}
          onDeclineAll={() => sceneControllerRegistry.declineAll()}
          isFullscreen={isFullscreen}
          onToggleFullscreen={onToggleFullscreen}
        />
      }
      viewport={
        <ScenePanelViewport
          containerRef={containerRef}
          style={{ overflowX, overflowY }}
        >
          <SceneControllerRegistryProvider registry={sceneControllerRegistry}>
            <SceneView
              sceneModel={sceneModel}
              scale={scale}
              fitMode={fitMode}
            />
          </SceneControllerRegistryProvider>
        </ScenePanelViewport>
      }
    />
  );
};

export default ScenePanel;
