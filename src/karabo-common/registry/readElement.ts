/**
 * Public reader dispatch function.
 *
 * Takes a parsed element, resolves its reader in the registry,
 * invokes that reader, and returns the concrete model instance.
 */

import type { BaseSceneObjectData } from '@/karabo-common/models/bases';
import { readerRegistry } from './ReaderRegistry';

export function readElement(
  element: Record<string, unknown>,
  tag?: string
): BaseSceneObjectData {
  return readerRegistry.read(element, tag);
}
