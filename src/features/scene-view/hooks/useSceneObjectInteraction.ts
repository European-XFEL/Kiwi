import React from 'react';
import {
  resolveSceneObjectInteraction,
  type SceneObjectInteraction,
} from '../utils/sceneObjectInteraction';
import { useSceneControllerRegistry } from './useSceneControllerRegistry';

export interface UseSceneObjectInteractionOptions {
  scale: number;
  enabled?: boolean;
  onPointerDown?: (
    interaction: SceneObjectInteraction,
    event: React.PointerEvent<HTMLElement>
  ) => void;
}

export function useSceneObjectInteraction({
  scale,
  enabled = true,
  onPointerDown,
}: UseSceneObjectInteractionOptions): React.PointerEventHandler<HTMLElement> {
  const sceneRegistry = useSceneControllerRegistry();

  return React.useCallback(
    (event) => {
      if (!enabled) return;

      onPointerDown?.(
        resolveSceneObjectInteraction({
          clientX: event.clientX,
          clientY: event.clientY,
          target: event.target,
          sceneElement: event.currentTarget,
          scale,
          registry: sceneRegistry,
        }),
        event
      );
    },
    [enabled, onPointerDown, scale, sceneRegistry]
  );
}
