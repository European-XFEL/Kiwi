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
import { getChildObjectId } from '../utils/objectId';
import { collectSceneLayers } from '../utils/visitor';
import { useSceneObjectInteractionLogger } from '../hooks/useSceneObjectInteractionLogger';

// Bootstrap — triggers all registerRenderer() calls
import '../renderers';

export interface SceneViewProps {
  sceneModel: SceneModel;
  scale: number;
  fitMode: FitMode;
}

const SceneView: React.FC<SceneViewProps> = React.memo(
  ({ sceneModel, scale, fitMode }) => {
    const sceneDimensions = React.useMemo(
      () => ({
        width: sceneModel.width,
        height: sceneModel.height,
      }),
      [sceneModel.width, sceneModel.height]
    );

    // objectIds are index-based structural addresses, valid only for the
    // currently rendered model. That is safe today: the registry holds live
    // mounted controllers only, so a model change remounts and re-registers
    // everything under the new indices in the same commit.
    // TODO(scene-editing): once a scene can be altered in place, indices shift
    // when children are added/removed, so identity that must survive edits
    // needs ids carried by the model itself (e.g. a uuid assigned at parse
    // time, a stable key persisted in the scene XML, or a content-derived
    // fingerprint of the object's properties) instead of enumeration.
    const rootObjectId = `scene:${sceneModel.uuid}`;
    const scrollable = isScrollableMode(fitMode);
    const scrollableAlignment = getScrollableAlignment(fitMode);
    const scaledSize = getScaledSceneSize(sceneDimensions, scale);
    const spacer = getSpacerSize(scaledSize.width, scaledSize.height);
    const handleScenePointerDown = useSceneObjectInteractionLogger(scale);
    const sceneOuterId = useId();
    const sceneInnerId = useId();
    const scrollableId = useId();
    const sceneViewId = useId();

    const sceneEntries = React.useMemo(() => {
      const entriesByLayer = collectSceneLayers(sceneModel.children);
      const orderedEntries = [
        ...entriesByLayer.shape,
        ...entriesByLayer.widget,
      ];

      return orderedEntries.map(({ model, context }) => (
        <KaraboSceneWidget
          key={`${context.layer}_${context.layerIndex}`}
          model={model}
          objectId={getChildObjectId(rootObjectId, context.rootIndex)}
          layer={context.layer}
        />
      ));
    }, [sceneModel.children, rootObjectId]);

    const scene = (
      <div
        id={`SceneView-Scene-Outer-${sceneOuterId}`}
        key={sceneModel.uuid}
        style={{
          position: 'relative',
          width: scaledSize.width,
          height: scaledSize.height,
          flex: '0 0 auto',
        }}
      >
        <div
          id={`SceneView-Scene-Inner-${sceneInnerId}`}
          className="overflow-hidden rounded-md bg-[#eeeeee] shadow-lg"
          onPointerDownCapture={handleScenePointerDown}
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
        id={`SceneView-Scrollable-${scrollableId}`}
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
        id={`SceneView-${sceneViewId}`}
        className="grid min-h-full min-w-full place-items-center"
      >
        {scene}
      </div>
    );
  }
);

SceneView.displayName = 'SceneView';

export default SceneView;
