import type React from 'react';

export type SceneInteractionMode = 'view' | 'edit';

// Current runtime mode is view-only.
// TODO: Later, wire this to SceneView state/context.
const DEFAULT_SCENE_INTERACTION_MODE: SceneInteractionMode = 'view';

// Layout container wrappers (the full-box div around a Box/Grid/Fixed layout)
// stay transparent to pointer events in view mode. This lets a click fall
// through the container's empty area to whatever child or layer is painted
// underneath, so the innermost item — not the layout — wins the hit.
export function containerPointerEvents(
  mode: SceneInteractionMode = DEFAULT_SCENE_INTERACTION_MODE
): React.CSSProperties['pointerEvents'] {
  return mode === 'view' ? 'none' : undefined;
}

// Wrappers that position a single object (a top-level scene object or a layout
// child) are pointer targets in view mode, so the object — including static
// widgets like Label that don't re-enable pointer events themselves — resolves
// on click. Because hit resolution uses closest('[data-scene-object-id]'), an
// item inside a layout still wins over its containing layout: its own wrapper is
// the nearest match. Controllers re-enable pointer events on their content too;
// this just covers everything else.
export function objectPointerEvents(
  mode: SceneInteractionMode = DEFAULT_SCENE_INTERACTION_MODE
): React.CSSProperties['pointerEvents'] {
  return mode === 'view' ? 'auto' : undefined;
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
