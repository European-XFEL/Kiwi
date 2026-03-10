import { ElementRenderer } from '../render/ElementRenderer';
import { useSceneLoader } from '../hooks/useSceneLoader';
import {
  SceneFatalError,
  SceneLoadError,
  SceneLoading,
} from './SceneStatusViews';
import { SceneShell } from './SceneShell';
import { SceneStage } from './SceneStage';
import { SceneViewport } from './SceneViewport';
import { SceneWindow } from './SceneWindow';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { useLoadedSceneStore } from '@/store/loadedSceneStore';
import React from 'react';
import { useSceneScale } from '../hooks/useSceneScale';
import {
  getOverflow,
  getSpacerSize,
  isScrollableMode,
} from '../utils/sceneLayout';

// Bootstrap — triggers all registerRenderer() calls
import '../renderers';

const SceneView: React.FC = () => {
  const { lastGlobalError } = useGlobalStore();
  const { fitMode } = useLoadedSceneStore();
  const { scene, error } = useSceneLoader();

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const sceneDimensions = React.useMemo(
    () => (scene ? { width: scene.width, height: scene.height } : null),
    [scene?.width, scene?.height]
  );
  const scale = useSceneScale(containerRef, sceneDimensions, fitMode);

  // Mode-derived layout values — only recompute when fitMode changes
  const { scrollable, overflowX, overflowY } = React.useMemo(
    () => ({
      scrollable: isScrollableMode(fitMode),
      ...getOverflow(fitMode),
    }),
    [fitMode]
  );

  // Spacer tracks scale changes, not mode changes
  const spacer = React.useMemo(
    () =>
      getSpacerSize((scene?.width ?? 0) * scale, (scene?.height ?? 0) * scale),
    [scene?.width, scene?.height, scale]
  );

  // Scene layers — rebuild only when scene changes so widget/controller subtree
  // does not re-render on scale or mode changes.
  const layers = React.useMemo(
    () =>
      scene ? (
        <>
          {scene.children.map((child, i) => (
            <ElementRenderer key={i} model={child} />
          ))}
        </>
      ) : null,
    [scene]
  );

  // Stage wraps widgets with the current scale transform.
  // Rebuilds on scale change but passes the same stable widgets reference,
  // so React reconciles without re-rendering the widget subtree.
  const stage = React.useMemo(
    () =>
      scene ? (
        <SceneStage width={scene.width} height={scene.height} scale={scale}>
          {layers}
        </SceneStage>
      ) : null,
    [scene?.width, scene?.height, scale, layers]
  );

  if (!scene)
    return error ? <SceneLoadError message={error} /> : <SceneLoading />;
  if (lastGlobalError) return <SceneFatalError message={lastGlobalError} />;

  return (
    <SceneWindow className="w-full h-full flex flex-col">
      <SceneShell className="relative flex flex-1 min-h-0">
        <SceneViewport
          containerRef={containerRef}
          className="flex-1 bg-muted [&::-webkit-scrollbar]:hidden"
          style={{ overflowX, overflowY }}
        >
          {scrollable ? (
            <div
              style={{
                position: 'relative',
                width: spacer.width,
                height: spacer.height,
              }}
            >
              <div style={{ position: 'absolute', left: 0, top: 0 }}>
                {stage}
              </div>
            </div>
          ) : (
            <div className="grid min-h-full min-w-full place-items-center">
              {stage}
            </div>
          )}
        </SceneViewport>
      </SceneShell>
    </SceneWindow>
  );
};

export default SceneView;
