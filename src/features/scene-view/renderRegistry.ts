/** Render registry — module-level map of model key → React renderer. */

import type React from 'react';
import { BaseSceneObjectData, BaseWidgetObjectData } from '@/karabo/common/api';
import type { SceneLayer } from './bounds';
import {
  BoxLayoutModel,
  FixedLayoutModel,
  GridLayoutModel,
} from '@/karabo/common/api';
import {
  ArrowPolygonModel,
  LineModel,
  PathModel,
  PolygonModel,
  RectangleModel,
} from '@/karabo/common/api';

// Renderer
// ----------------------------------------------------------------------------

export interface RendererProps<
  TModel extends BaseSceneObjectData = BaseSceneObjectData,
  TContext = unknown,
> {
  model: TModel;
  ctx?: TContext;
  layer?: SceneLayer;
  objectId?: string;
}

export type Renderer<TProps extends RendererProps = RendererProps> =
  React.FC<TProps>;

const entries = new Map<string, Renderer>();

// resolveKey
// ----------------------------------------------------------------------------

function resolveKey(model: BaseSceneObjectData): string | undefined {
  // Widgets — all extend BaseWidgetObjectData which has klass
  if (model instanceof BaseWidgetObjectData) return model.klass || undefined;
  // Layouts — keyed by class name
  if (model instanceof BoxLayoutModel) return 'BoxLayout';
  if (model instanceof FixedLayoutModel) return 'FixedLayout';
  if (model instanceof GridLayoutModel) return 'GridLayout';
  // Shapes — keyed by class name
  if (model instanceof LineModel) return 'Line';
  if (model instanceof RectangleModel) return 'Rectangle';
  if (model instanceof PolygonModel) return 'Polygon';
  if (model instanceof ArrowPolygonModel) return 'ArrowPolygon';
  if (model instanceof PathModel) return 'Path';
  return undefined;
}

// Public API
// ----------------------------------------------------------------------------

export function registerRenderer<TProps extends RendererProps>(
  klass: string,
  component: Renderer<TProps>
): void {
  entries.set(klass, component as Renderer);
}

export function getRenderer(model: BaseSceneObjectData): Renderer | undefined {
  const key = resolveKey(model);
  return key ? entries.get(key) : undefined;
}
