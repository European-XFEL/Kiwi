import { KaraboSceneWidget } from '../KaraboSceneWidget';
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
import { useGlobalStore, useLoadedSceneStore } from '@/store/api';
import React from 'react';
import { useSceneScale } from '../hooks/useSceneScale';
import {
  getOverflow,
  getScaledSceneSize,
  getScrollableAlignment,
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

  const scrollableAlignment = React.useMemo(
    () => getScrollableAlignment(fitMode),
    [fitMode]
  );

  // The browser needs the scaled footprint, not the authored scene size,
  // whenever layout or centering depends on the visible scene bounds.
  const scaledSize = React.useMemo(
    () => getScaledSceneSize(sceneDimensions, scale),
    [sceneDimensions, scale]
  );

  // Spacer tracks scale changes, not mode changes
  const spacer = React.useMemo(
    () => getSpacerSize(scaledSize.width, scaledSize.height),
    [scaledSize.width, scaledSize.height]
  );

  // Scene layers — rebuild only when scene changes so widget/controller subtree
  // does not re-render on scale or mode changes.
  const layers = React.useMemo(
    () =>
      scene ? (
        <>
          {scene.children.map((child, i) => (
            <KaraboSceneWidget key={`shape_${i}`} model={child} phase="shape" />
          ))}
          {scene.children.map((child, i) => (
            <KaraboSceneWidget
              key={`widget_${i}`}
              model={child}
              phase="widget"
            />
          ))}
        </>
      ) : null,
    [scene]
  );

  // Scale the authored stage inside a wrapper that owns the scaled layout footprint.
  // This keeps centering based on what the user actually sees instead of the
  // unscaled authored scene box, because CSS transforms do not affect layout size.
  const stage = React.useMemo(
    () =>
      scene ? (
        <div
          key={scene.uuid}
          style={{
            position: 'relative',
            width: scaledSize.width,
            height: scaledSize.height,
            flex: '0 0 auto',
          }}
        >
          <div style={{ position: 'absolute', left: 0, top: 0 }}>
            <SceneStage width={scene.width} height={scene.height} scale={scale}>
              {layers}
            </SceneStage>
          </div>
        </div>
      ) : null,
    [
      scene?.uuid,
      scene?.width,
      scene?.height,
      scale,
      scaledSize.width,
      scaledSize.height,
      layers,
    ]
  );

  if (!scene)
    return error ? <SceneLoadError message={error} /> : <SceneLoading />;
  if (lastGlobalError) return <SceneFatalError message={lastGlobalError} />;

  return (
    <SceneWindow className="w-full h-full flex flex-col">
      <SceneShell className="relative flex flex-1 min-h-0">
        <SceneViewport
          containerRef={containerRef}
          className="flex-1 bg-muted"
          style={{ overflowX, overflowY }}
        >
          {scrollable ? (
            <div
              style={{
                width: spacer.width,
                height: spacer.height,
                minWidth: '100%',
                minHeight: '100%',
                display: 'grid',
                justifyItems: scrollableAlignment.justifyItems,
                alignItems: scrollableAlignment.alignItems,
              }}
            >
              {stage}
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
