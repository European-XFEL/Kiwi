import React from 'react';
import {
  useSceneObjectInteraction,
  type UseSceneObjectInteractionOptions,
} from './useSceneObjectInteraction';
import type {
  SceneObjectInteraction,
  ScenePoint,
} from '../utils/sceneObjectInteraction';

function roundPoint(point: ScenePoint): ScenePoint {
  return {
    x: Number(point.x.toFixed(2)),
    y: Number(point.y.toFixed(2)),
  };
}

function logSceneObjectInteraction(interaction: SceneObjectInteraction): void {
  const { objectId, controller } = interaction;
  const scenePoint = roundPoint(interaction.scenePoint);

  if (!objectId) {
    console.log('[scene-interaction] miss', { scenePoint });
    return;
  }

  console.log('[scene-interaction] target', {
    objectId,
    hasController: controller !== null,
    model: controller?.model.constructor.name,
    scenePoint,
  });
}

// Dev-only debug consumer of the scene interaction infrastructure. Gated on
// NODE_ENV (matching src/lib/performance.ts) so it stays out of production
// builds and out of test console output.
const IS_DEV = process.env.NODE_ENV === 'development';

export function useSceneObjectInteractionLogger(
  scale: number
): React.PointerEventHandler<HTMLElement> | undefined {
  const handlePointerDown = React.useCallback<
    NonNullable<UseSceneObjectInteractionOptions['onPointerDown']>
  >((interaction) => {
    logSceneObjectInteraction(interaction);
  }, []);

  const handleScenePointerDown = useSceneObjectInteraction({
    scale,
    enabled: IS_DEV,
    onPointerDown: handlePointerDown,
  });

  // Returning undefined outside dev keeps the capture listener off the scene
  // element entirely instead of binding a no-op handler.
  return IS_DEV ? handleScenePointerDown : undefined;
}
