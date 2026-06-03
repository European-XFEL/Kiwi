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

// useContainer
// ---

export function useContainer(): ContainerState {
  return {
    containerStyle: { pointerEvents: 'none' },
    contentsStyle: {
      display: 'contents',
      pointerEvents: 'auto',
    },
  };
}
