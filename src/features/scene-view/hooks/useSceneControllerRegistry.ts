import React from 'react';
import {
  SceneControllerRegistryContext,
  type SceneControllerRegistry,
} from '../contexts/SceneControllerRegistryContext';

export function useSceneControllerRegistry(): SceneControllerRegistry | null {
  return React.useContext(SceneControllerRegistryContext);
}
