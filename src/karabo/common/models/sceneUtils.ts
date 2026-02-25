/** Scene utility functions — behavior that lives outside the model. */

import { BaseLayoutModel, BaseSceneObjectData } from './bases';
import { SceneModel } from './SceneModel';

// walkScene
// ----------------------------------------------------------------------------

/** Depth-first walk of the entire scene tree. */
export function walkScene(
  scene: SceneModel,
  visitor: (element: BaseSceneObjectData, depth: number) => void
): void {
  const walkNode = (el: BaseSceneObjectData, depth: number): void => {
    visitor(el, depth);
    if (el instanceof BaseLayoutModel) {
      for (const child of el.children) walkNode(child, depth + 1);
    }
  };
  for (const child of scene.children) walkNode(child, 0);
}

// flattenScene
// ----------------------------------------------------------------------------

/** Flat list of all elements in the scene tree (depth-first). */
export function flattenScene(scene: SceneModel): BaseSceneObjectData[] {
  const out: BaseSceneObjectData[] = [];
  const flatten = (node: BaseSceneObjectData): void => {
    out.push(node);
    if (node instanceof BaseLayoutModel) {
      for (const child of node.children) flatten(child);
    }
  };
  for (const child of scene.children) flatten(child);
  return out;
}
