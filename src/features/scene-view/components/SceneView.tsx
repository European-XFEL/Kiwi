import { SceneModel } from '@/karabo/common/api';
import { useLoadedSceneStore } from '@/store/api';
import React from 'react';
import { KaraboSceneWidget } from '../KaraboSceneWidget';
import { useSceneScale } from '../hooks/useSceneScale';
import {
  getOverflow,
  getScaledSceneSize,
  getScrollableAlignment,
  getSpacerSize,
  isScrollableMode,
} from '../utils/sceneLayout';
import { collectSceneLayers } from '../utils/visitor';
import { SceneShell } from './SceneShell';
import { SceneStage } from './SceneStage';
import { SceneViewport } from './SceneViewport';
import { SceneWindow } from './SceneWindow';

// Bootstrap — triggers all registerRenderer() calls
import '../renderers';

export interface SceneViewProps {
  sceneModel: SceneModel;
}

const SceneView: React.FC<SceneViewProps> = ({ sceneModel }) => {
  const { fitMode } = useLoadedSceneStore();

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const sceneDimensions = React.useMemo(
    () => ({ width: sceneModel.width, height: sceneModel.height }),
    [sceneModel.height, sceneModel.width]
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

  // Build root scene layers through the shared collector so the stage keeps
  // the global shape-then-widget ordering while nested traversal stays shared.
  const layers = React.useMemo(() => {
    const entriesByLayer = collectSceneLayers(sceneModel.children);

    const orderedEntries = [...entriesByLayer.shape, ...entriesByLayer.widget];

    return (
      <>
        {orderedEntries.map(({ model, context }) => (
          <KaraboSceneWidget
            key={`${context.layer}_${context.layerIndex}`}
            model={model}
            layer={context.layer}
          />
        ))}
      </>
    );
  }, [sceneModel]);

  // Scale the authored stage inside a wrapper that owns the scaled layout footprint.
  // This keeps centering based on what the user actually sees instead of the
  // unscaled authored scene box, because CSS transforms do not affect layout size.
  const stage = React.useMemo(
    () => (
      <div
        key={sceneModel.uuid}
        style={{
          position: 'relative',
          width: scaledSize.width,
          height: scaledSize.height,
          flex: '0 0 auto',
        }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0 }}>
          <SceneStage
            width={sceneModel.width}
            height={sceneModel.height}
            scale={scale}
          >
            {layers}
          </SceneStage>
        </div>
      </div>
    ),
    [
      sceneModel.uuid,
      sceneModel.width,
      sceneModel.height,
      scale,
      scaledSize.width,
      scaledSize.height,
      layers,
    ]
  );

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
