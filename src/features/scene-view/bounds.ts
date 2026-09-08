/**
 * resolveBounds — answer "where does this model sit and how big is it?"
 *
 * Not all models store position the same way:
 */

import {
  type BaseSceneObjectData,
  BaseLayoutModel,
  BaseShapeObjectData,
  BaseWidgetObjectData,
} from '@/karabo/common/scenemodel/bases';
import {
  LineModel,
  PolygonModel,
  ArrowPolygonModel,
  RectangleModel,
} from '@/karabo/common/scenemodel/shapes';

// Bounds
// ---

/** The normalised box every caller gets back. */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** True for purely decorative shape elements (Line, Polygon, Arrow, Rectangle, Path). */
export const isShape = (sceneElement: BaseSceneObjectData): boolean =>
  sceneElement instanceof BaseShapeObjectData;

/** True for layout containers (Fixed, Grid, Box) which are usually wrapper-only. */
export const isLayout = (sceneElement: BaseSceneObjectData): boolean =>
  sceneElement instanceof BaseLayoutModel;

// SceneLayer
// ---

export type SceneLayer = 'shape' | 'widget';

// resolveBounds
// ---

export function resolveBounds(model: BaseSceneObjectData): Bounds {
  // Line, Polygon, ArrowPolygon derive their bounding box from point data, and
  // Rectangle normalises negative extents the way Qt does.
  if (
    model instanceof LineModel ||
    model instanceof PolygonModel ||
    model instanceof ArrowPolygonModel ||
    model instanceof RectangleModel
  ) {
    return {
      x: model.computedX,
      y: model.computedY,
      width: model.computedWidth,
      height: model.computedHeight,
    };
  }

  // Layouts and widgets store position as plain x/y/width/height.
  if (
    model instanceof BaseLayoutModel ||
    model instanceof BaseWidgetObjectData
  ) {
    return { x: model.x, y: model.y, width: model.width, height: model.height };
  }

  return { x: 0, y: 0, width: 0, height: 0 };
}
