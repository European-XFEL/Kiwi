import { BaseSceneObjectData } from '@/karabo/common/api';
import type { SceneLayer } from '../bounds';
import { isLayout, isShape } from './sceneNodePredicates';

export interface SceneLayerContext {
  layer: SceneLayer;
  layerIndex: number;
  rootIndex: number;
}

export interface SceneLayerEntry {
  model: BaseSceneObjectData;
  context: SceneLayerContext;
}

export interface SceneVisitContext {
  layer: SceneLayer;
  depth: number;
  index: number;
  path: readonly number[];
}

const SCENE_LAYERS: readonly SceneLayer[] = ['shape', 'widget'];

// Returns whether a model contributes visible content in the active layer.
// Layouts are included only when at least one descendant is visible.
export const isVisibleInLayer = (
  model: BaseSceneObjectData,
  layer: SceneLayer
): boolean => {
  if (isLayout(model)) {
    return model.children.some((child) => isVisibleInLayer(child, layer));
  }

  return layer === 'shape' ? isShape(model) : !isShape(model);
};

// Creates the starting context for a root scene node in a given layer.
export const createRootVisitContext = (
  layer: SceneLayer,
  rootIndex: number
): SceneVisitContext => ({
  layer,
  depth: 0,
  index: rootIndex,
  path: [rootIndex],
});

// Derives the child context while preserving the active layer.
export const getChildVisitContext = (
  parent: SceneVisitContext,
  index: number
): SceneVisitContext => ({
  layer: parent.layer,
  depth: parent.depth + 1,
  index,
  path: [...parent.path, index],
});

// Walks root models once and reports each layer membership with a per-layer index.
export const visitSceneLayers = (
  models: BaseSceneObjectData[],
  visitor: (model: BaseSceneObjectData, ctx: SceneLayerContext) => void
): void => {
  const layerIndices: Record<SceneLayer, number> = { shape: 0, widget: 0 };

  models.forEach((model, rootIndex) => {
    SCENE_LAYERS.forEach((layer) => {
      if (!isVisibleInLayer(model, layer)) return;

      visitor(model, {
        layer,
        layerIndex: layerIndices[layer]++,
        rootIndex,
      });
    });
  });
};

// Collects the root scene entries already grouped in the stage render order:
// all shape roots first, then all widget roots.
export const collectSceneLayers = (
  models: BaseSceneObjectData[]
): Record<SceneLayer, SceneLayerEntry[]> => {
  const entriesByLayer: Record<SceneLayer, SceneLayerEntry[]> = {
    shape: [],
    widget: [],
  };

  visitSceneLayers(models, (model, context) => {
    entriesByLayer[context.layer].push({ model, context });
  });

  return entriesByLayer;
};

export type SceneTreeVisitor<TResult> = (
  model: BaseSceneObjectData,
  ctx: SceneVisitContext,
  visitChild: (child: BaseSceneObjectData, index: number) => TResult | null
) => TResult | null;

// Recursively visits one model subtree while keeping the caller-provided layer context.
export const visitSceneTree = <TResult>(
  model: BaseSceneObjectData,
  ctx: SceneVisitContext,
  visitor: SceneTreeVisitor<TResult>
): TResult | null => {
  if (!isVisibleInLayer(model, ctx.layer)) return null;

  return visitor(model, ctx, (child, index) =>
    visitSceneTree(child, getChildVisitContext(ctx, index), visitor)
  );
};
