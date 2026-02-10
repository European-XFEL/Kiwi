/**
 * BuilderRegistry.ts
 *
 * Central registry for scene element builder functions.
 *
 * Key format:
 *  - widget:<parent_component>:<klass>
 *  - layout:<klass>
 *  - shape:<klass>
 */

import type { BaseSceneObjectData } from '../models/bases';
import { ATTR_KRB_CLASS, ATTR_KRB_WIDGET } from '../constants';

// Types
// ----------------------------------------------------------------------------

/** Builder function signature - takes parsed JSON, returns model instance */
export type BuilderFn<T extends BaseSceneObjectData = BaseSceneObjectData> = (
  json: Record<string, unknown>
) => T;

/**
 * Discriminated union describing what a builder handles.
 * Uses Python Karabo field names: klass, parent_component.
 */
export type BuildMeta =
  | { elementType: 'widget'; parent_component: string; klass: string }
  | { elementType: 'layout'; klass: string }
  | { elementType: 'shape'; klass: string };

// Key builder
// ----------------------------------------------------------------------------

/** Build a registry key from metadata. */
export function makeKey(meta: BuildMeta): string {
  switch (meta.elementType) {
    case 'widget':
      return `widget:${meta.parent_component}:${meta.klass}`;
    case 'layout':
      return `layout:${meta.klass}`;
    case 'shape':
      return `shape:${meta.klass}`;
  }
}

// Registry class
// ----------------------------------------------------------------------------

class BuilderRegistry {
  private map = new Map<string, BuilderFn>();

  register(meta: BuildMeta, builderFn: BuilderFn): void {
    const key = makeKey(meta);
    if (this.map.has(key)) {
      console.warn(`[BuilderRegistry] Duplicate key: "${key}"`);
    }
    this.map.set(key, builderFn);
  }

  resolve(meta: BuildMeta): BuilderFn | undefined {
    return this.map.get(makeKey(meta));
  }

  get(key: string): BuilderFn | undefined {
    return this.map.get(key);
  }

  get size(): number {
    return this.map.size;
  }

  keys(): string[] {
    return Array.from(this.map.keys()).sort();
  }

  clear(): void {
    this.map.clear();
  }
}

/** Singleton registry instance */
export const builderRegistry = new BuilderRegistry();

// Resolvers
// ----------------------------------------------------------------------------

/** Resolves a BuildMeta for a widget from parsed XML attributes. */
export function resolveWidgetMeta(attrs: Record<string, string>): BuildMeta {
  const klass = attrs[ATTR_KRB_WIDGET] ?? attrs[ATTR_KRB_CLASS] ?? '';
  const parent_component = attrs[ATTR_KRB_WIDGET]
    ? (attrs[ATTR_KRB_CLASS] ?? 'DisplayComponent')
    : 'DisplayComponent';

  return { elementType: 'widget', parent_component, klass };
}
