/** ReaderRegistry — flat name → reader map with version support. */

import type { BaseSceneObjectData } from './bases';
import {
  ATTR_KRB_CLASS,
  ATTR_KRB_WIDGET,
  SCENE_FILE_VERSION,
  UNKNOWN_WIDGET_CLASS,
} from './constants';

// Types
// ----------------------------------------------------------------------------

export type ReaderFn = (json: Record<string, unknown>) => BaseSceneObjectData;

// ReaderEntry
// ----------------------------------------------------------------------------

/** Holds one or more versioned reader functions for a single name. */
class ReaderEntry {
  private functions = new Map<number, ReaderFn>();

  add(version: number, fn: ReaderFn): void {
    this.functions.set(version, fn);
  }

  getFunction(version: number): ReaderFn | undefined {
    const exact = this.functions.get(version);
    if (exact) return exact;

    let highestVersion = Number.NEGATIVE_INFINITY;
    let fallback: ReaderFn | undefined;
    for (const [candidateVersion, fn] of this.functions.entries()) {
      if (candidateVersion > highestVersion) {
        highestVersion = candidateVersion;
        fallback = fn;
      }
    }

    return fallback;
  }
}

// Registry
// ----------------------------------------------------------------------------

class ReaderRegistry {
  private static instance: ReaderRegistry | null = null;

  private entries = new Map<string, ReaderEntry>();

  version = SCENE_FILE_VERSION;

  private constructor() {}

  static getInstance(): ReaderRegistry {
    if (ReaderRegistry.instance === null) {
      ReaderRegistry.instance = new ReaderRegistry();
    }
    return ReaderRegistry.instance;
  }

  /** Register a reader under a name, optionally also under an xmltag. */
  register(
    name: string,
    reader: ReaderFn,
    xmltag?: string,
    version = SCENE_FILE_VERSION
  ): void {
    this.addEntry(name, reader, version);
    if (xmltag) {
      this.addEntry(xmltag, reader, version);
    }
  }

  private addEntry(name: string, reader: ReaderFn, version: number): void {
    let entry = this.entries.get(name);
    if (!entry) {
      entry = new ReaderEntry();
      this.entries.set(name, entry);
    }
    entry.add(version, reader);
  }

  /** Resolve klass, find versioned reader, call it, return model. */
  read(json: Record<string, unknown>, tag?: string): BaseSceneObjectData {
    const klass = this.fetchKlass(json, this.fetchTag(json, tag));
    const reader = this.entries.get(klass)?.getFunction(this.version);
    if (!reader) {
      throw new Error(`No reader found for "${klass}" v${this.version}`);
    }
    return reader(json);
  }

  has(name: string): boolean {
    return this.entries.has(name);
  }

  private fetchTag(json: Record<string, unknown>, tag?: string): string {
    if (tag) return tag;
    const parsedTag = json.__tag__;
    return typeof parsedTag === 'string' ? parsedTag : '';
  }

  /** Resolve which name to look up for a parsed JSON element.
   *
   * Fallback chain:
   * 1. krb:widget — most specific (e.g. "DisplayLabel")
   * 2. krb:class  — parent component or v1 widget name (e.g. "Label")
   * 3. tag        — SVG element name (e.g. "svg:rect", "svg:g")
   * 4. "*"        — wildcard catch-all
   */
  private fetchKlass(json: Record<string, unknown>, tag: string): string {
    const widget = json[ATTR_KRB_WIDGET] as string | undefined;
    if (widget) {
      return this.has(widget) ? widget : UNKNOWN_WIDGET_CLASS;
    }

    const klass = json[ATTR_KRB_CLASS] as string | undefined;
    if (klass) {
      return this.has(klass) ? klass : UNKNOWN_WIDGET_CLASS;
    }

    if (this.has(tag)) return tag;

    return '*';
  }

  get size(): number {
    return this.entries.size;
  }

  keys(): string[] {
    return Array.from(this.entries.keys()).sort();
  }

  clear(): void {
    this.entries.clear();
  }
}

export const readerRegistry = ReaderRegistry.getInstance();

export function readElement(
  element: Record<string, unknown>,
  tag?: string
): BaseSceneObjectData {
  return readerRegistry.read(element, tag);
}

/**
 * Register a reader function in the ReaderRegistry.
 *
 * @param name    — Lookup key, typically the krb:widget or krb:class value (e.g. "DisplayLabel", "BoxLayout").
 * @param readerFn — Factory that receives parsed JSON and returns a model instance.
 * @param xmltag  — Optional SVG tag to double-register under (e.g. SVG_RECT, SVG_SVG).
 *                   Only needed for elements identified by tag alone (shapes, scene root).
 * @param version — Scene file version this reader targets. Defaults to SCENE_FILE_VERSION.
 */
export function registerReader(
  name: string,
  readerFn: ReaderFn,
  xmltag?: string,
  version = SCENE_FILE_VERSION
): void {
  readerRegistry.register(name, readerFn, xmltag, version);
}
