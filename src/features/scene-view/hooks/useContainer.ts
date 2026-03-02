/**
 * useContainer — shell state for ControllerContainer.
 *
 * Returns pointer-events and contents wrapper style driven by the scene
 * interaction mode. When the mode is wired to context this hook will call
 * useContext internally — making it a hook from day one keeps that change local.
 */

import type React from 'react';
import { containerPointerEvents, contentsWrapperStyle } from '../utils/mode';

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
    containerStyle: { pointerEvents: containerPointerEvents() },
    contentsStyle: contentsWrapperStyle(),
  };
}
