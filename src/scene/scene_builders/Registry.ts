/**
 * Registry.ts
 * Central registry for builder functions used to construct Scene elements.
 * Organizes builders by namespace (controller, widget, shape, layout).
 */

import type { BaseSceneElementModel } from "../scene_models/BaseModels";

/** Builder function signature */
export type BuilderFunction = (json: any) => BaseSceneElementModel | null;

/** Top-level builder categories */
export type WidgetNamespace = "controller" | "widget" | "shape" | "layout";

/** Controller subcategories (display, editable, etc.) */
export type ControllerCategory = "display" | "editable" | "output" | string;

/** Parsed key info for debugging and filtering */
export interface ParsedRegistryKey {
  namespace: WidgetNamespace;
  category?: ControllerCategory;
  name: string;
  fullKey: string;
}

/** Internal registry entry */
export interface RegistryEntry {
  key: string;
  parsed: ParsedRegistryKey;
  builder: BuilderFunction;
  description?: string;
}

/** Parse a key like "controller:display:displaylabel" */
export function parseRegistryKey(key: string): ParsedRegistryKey {
  const parts = key.toLowerCase().split(":");

  if (parts.length === 3) {
    const [namespace, category, name] = parts;
    return {
      namespace: namespace as WidgetNamespace,
      category,
      name,
      fullKey: key.toLowerCase(),
    };
  }
  if (parts.length === 2) {
    const [namespace, name] = parts;
    return {
      namespace: namespace as WidgetNamespace,
      name,
      fullKey: key.toLowerCase(),
    };
  }
  throw new Error(
    `Invalid key "${key}". Expected "namespace:name" or "namespace:category:name".`
  );
}

/** Build a consistent key from components */
export function buildRegistryKey(
  namespace: WidgetNamespace,
  name: string,
  category?: ControllerCategory
): string {
  return category
    ? `${namespace}:${category}:${name}`.toLowerCase()
    : `${namespace}:${name}`.toLowerCase();
}

/** Main registry class */
export class SceneElementRegistry {
  private readonly map = new Map<string, RegistryEntry>();

  register(key: string, builder: BuilderFunction, description?: string): this {
    const parsed = parseRegistryKey(key);
    this.map.set(parsed.fullKey, {
      key: parsed.fullKey,
      parsed,
      builder,
      description,
    });
    return this;
  }

  get(key: string): BuilderFunction | undefined {
    return this.map.get(parseRegistryKey(key).fullKey)?.builder;
  }

  has(key: string): boolean {
    return this.map.has(parseRegistryKey(key).fullKey);
  }

  unregister(key: string): boolean {
    return this.map.delete(parseRegistryKey(key).fullKey);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }

  keys(): string[] {
    return Array.from(this.map.keys());
  }

  getByNamespace(namespace: WidgetNamespace): RegistryEntry[] {
    return Array.from(this.map.values()).filter(
      (e) => e.parsed.namespace === namespace
    );
  }

  getByNamespaceAndCategory(
    namespace: WidgetNamespace,
    category: ControllerCategory
  ): RegistryEntry[] {
    return Array.from(this.map.values()).filter(
      (e) => e.parsed.namespace === namespace && e.parsed.category === category
    );
  }

  debug(): void {
    //console.group("SceneElementRegistry");
    //console.log(`Total registered: ${this.size}`);
    // for (const e of this.map.values()) console.log(`  ${e.parsed.fullKey}`);
    //console.groupEnd();
  }
}

/** Singleton instance */
export const defaultRegistry = new SceneElementRegistry();
