/**
 * Structural identity for scene nodes.
 *
 * An objectId is a node address in a tree: a parent id followed by the child
 * index. It is decoupled from geometry and data bindings, and is the
 * render-portable stand-in for the model object reference. Derived from
 * authored child order, not render order, so it stays stable across the
 * shape/widget render passes.
 *
 * The root token is supplied by the caller, so this helper stays generic. The
 * same scheme can later identify configurator or device-property nodes, not
 * just scene objects.
 */

/** DOM attribute linking a wrapper element to its scene objectId. */
export const SCENE_OBJECT_ID_ATTR = 'data-scene-object-id';

/** Props marking an element as the DOM wrapper for a scene object. */
export function sceneObjectIdAttr(objectId: string) {
  return { [SCENE_OBJECT_ID_ATTR]: objectId };
}

/** Append a child index to its parent objectId. */
export function getChildObjectId(
  parentObjectId: string,
  index: number
): string {
  return parentObjectId + '.' + index;
}

function toDomIdPart(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

export function getSceneObjectDomId(
  prefix: string,
  reactId: string,
  objectId: string
): string {
  return [prefix, reactId, objectId].map(toDomIdPart).filter(Boolean).join('-');
}
