/**
 * useContainer — shell state for ControllerContainer.
 *
 * Returns pointer-events and contents wrapper style for the current
 * view-only scene runtime.
 */

import type React from 'react';

// ContainerState
// ---

export interface ContainerState {
  containerStyle: React.CSSProperties;
  contentsStyle: React.CSSProperties;
}

const CONTAINER_STYLE: React.CSSProperties = { pointerEvents: 'none' };
const CONTENTS_STYLE: React.CSSProperties = {
  display: 'contents',
  pointerEvents: 'auto',
};

const CONTAINER_STATE: ContainerState = {
  containerStyle: CONTAINER_STYLE,
  contentsStyle: CONTENTS_STYLE,
};

// useContainer
// ---

export function useContainer(): ContainerState {
  return CONTAINER_STATE;
}
