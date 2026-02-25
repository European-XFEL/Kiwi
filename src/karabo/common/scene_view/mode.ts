import type React from 'react';

export type SceneInteractionMode = 'view' | 'edit';

// Current runtime mode is view-only.
// TODO: Later, wire this to SceneView state/context.
const DEFAULT_SCENE_INTERACTION_MODE: SceneInteractionMode = 'view';

export function containerPointerEvents(
  mode: SceneInteractionMode = DEFAULT_SCENE_INTERACTION_MODE
): React.CSSProperties['pointerEvents'] {
  return mode === 'view' ? 'none' : undefined;
}

export function contentPointerEvents(
  mode: SceneInteractionMode = DEFAULT_SCENE_INTERACTION_MODE
): React.CSSProperties['pointerEvents'] {
  return mode === 'view' ? 'auto' : undefined;
}

export function contentsWrapperStyle(
  mode: SceneInteractionMode = DEFAULT_SCENE_INTERACTION_MODE
): React.CSSProperties {
  return {
    display: 'contents',
    pointerEvents: contentPointerEvents(mode),
  };
}
