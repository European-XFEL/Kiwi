import React, { useId } from 'react';
import { SceneModel } from '@/karabo/common/api';
import { KaraboSceneWidget } from '../KaraboSceneWidget';
import type { FitMode } from '../hooks/useSceneScale';
import {
  getScaledSceneSize,
  getScrollableAlignment,
  getSpacerSize,
  isScrollableMode,
} from '../utils/sceneLayout';
import { collectSceneLayers } from '../utils/visitor';

// Bootstrap — triggers all registerRenderer() calls
import '../renderers';

export interface SceneViewProps {
  sceneModel: SceneModel;
  scale: number;
  fitMode: FitMode;
}

const SceneView: React.FC<SceneViewProps> = ({
  sceneModel,
  scale,
  fitMode,
}) => {
  const sceneDimensions = React.useMemo(
    () => ({
      width: sceneModel.width,
      height: sceneModel.height,
    }),
    [sceneModel.width, sceneModel.height]
  );

  const scrollable = isScrollableMode(fitMode);
  const scrollableAlignment = getScrollableAlignment(fitMode);
  const scaledSize = getScaledSceneSize(sceneDimensions, scale);
  const spacer = getSpacerSize(scaledSize.width, scaledSize.height);

  const sceneEntries = React.useMemo(() => {
    const entriesByLayer = collectSceneLayers(sceneModel.children);
    const orderedEntries = [...entriesByLayer.shape, ...entriesByLayer.widget];

    return orderedEntries.map(({ model, context }) => (
      <KaraboSceneWidget
        key={`${context.layer}_${context.layerIndex}`}
        model={model}
        layer={context.layer}
      />
    ));
  }, [sceneModel.children]);

  const scene = (
    <div
      id={`SceneView-Scene-Outer-${useId()}`}
      key={sceneModel.uuid}
      style={{
        position: 'relative',
        width: scaledSize.width,
        height: scaledSize.height,
        flex: '0 0 auto',
      }}
    >
      <div
        id={`SceneView-Scene-Inner-${useId()}`}
        className="overflow-hidden rounded-md bg-[#eeeeee] shadow-lg"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: sceneModel.width,
          height: sceneModel.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {sceneEntries}
      </div>
    </div>
  );

  return scrollable ? (
    <div
      id={`SceneView-Scrollable-${useId()}`}
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
      {scene}
    </div>
  ) : (
    <div
      id={`SceneView-${useId()}`}
      className="grid min-h-full min-w-full place-items-center"
    >
      {scene}
    </div>
  );
};

export default SceneView;
