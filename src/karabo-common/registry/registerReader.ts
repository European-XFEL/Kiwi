/**
 * registerReader — register a reader function by name.
 */

import type { ReaderFn } from './ReaderRegistry';
import { readerRegistry } from './ReaderRegistry';
import { SCENE_FILE_VERSION } from '../constants';

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
