import React from 'react';
import { broadcast_event, KaraboEvent } from '@/lib/events';
import { deriveControllerModel } from '../utils/deriveControllerModel';
import { isEditableWidget } from '../utils/sceneNodePredicates';
import {
  resolveSceneObjectInteraction,
  type SceneObjectInteraction,
} from '../utils/sceneObjectInteraction';
import { useSceneControllerRegistry } from './useSceneControllerRegistry';

export interface UseSceneObjectInteractionOptions {
  scale: number;
  enabled?: boolean;
}

function logSceneObjectInteraction(interaction: SceneObjectInteraction): void {
  const { objectId, controller } = interaction;
  const scenePoint = {
    x: Number(interaction.scenePoint.x.toFixed(2)),
    y: Number(interaction.scenePoint.y.toFixed(2)),
  };
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

export function useSceneObjectInteraction({
  scale,
  enabled = true,
}: UseSceneObjectInteractionOptions) {
  const sceneRegistry = useSceneControllerRegistry();

  const resolveInteraction = React.useCallback(
    (event: React.MouseEvent<HTMLElement>) =>
      resolveSceneObjectInteraction({
        clientX: event.clientX,
        clientY: event.clientY,
        target: event.target,
        sceneElement: event.currentTarget,
        scale,
        registry: sceneRegistry,
      }),
    [scale, sceneRegistry]
  );
  const handlePointerDown = React.useCallback<
    React.PointerEventHandler<HTMLElement>
  >(
    (event) => {
      if (enabled) {
        logSceneObjectInteraction(resolveInteraction(event));
      }
    },
    [enabled, resolveInteraction]
  );
  const handleDoubleClick = React.useCallback<
    React.MouseEventHandler<HTMLElement>
  >(
    (event) => {
      if (!enabled) {
        return;
      }
      const { controller } = resolveInteraction(event);
      if (!controller || isEditableWidget(controller.model)) {
        return;
      }
      const key = controller.model.keys[0];
      if (!key) {
        return;
      }
      const model = deriveControllerModel(controller.ctx.proxy?.binding);
      if (!model) {
        return;
      }
      model.keys = [key];
      broadcast_event(KaraboEvent.OpenControllerPanel, { model });
      event.preventDefault();
      event.stopPropagation();
    },
    [enabled, resolveInteraction]
  );

  // Keep the development logging listener off the scene in other builds.
  let onPointerDownCapture: React.PointerEventHandler<HTMLElement> | undefined;
  if (enabled && process.env.NODE_ENV === 'development') {
    onPointerDownCapture = handlePointerDown;
  }
  return { onPointerDownCapture, onDoubleClickCapture: handleDoubleClick };
}
