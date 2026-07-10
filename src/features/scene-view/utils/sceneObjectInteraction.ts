import type {
  SceneControllerRecord,
  SceneControllerRegistry,
} from '../contexts/SceneControllerRegistryContext';
import { SCENE_OBJECT_ID_ATTR } from './objectId';

export interface ScenePoint {
  x: number;
  y: number;
}

export interface SceneRect extends ScenePoint {
  width: number;
  height: number;
}

export interface SceneObjectInteraction {
  scenePoint: ScenePoint;
  objectId: string | null;
  controller: SceneControllerRecord | null;
}

export interface ResolveSceneObjectInteractionParams {
  clientX: number;
  clientY: number;
  target: EventTarget | null;
  sceneElement: Element;
  scale: number;
  registry: SceneControllerRegistry | null;
  elementsFromPoint?: (clientX: number, clientY: number) => Element[];
}

export const SCENE_OBJECT_ID_SELECTOR = `[${SCENE_OBJECT_ID_ATTR}]`;

function getSafeScale(scale: number): number {
  return scale > 0 ? scale : 1;
}

export function getScenePointFromPointer(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, 'left' | 'top'>,
  scale: number
): ScenePoint {
  const safeScale = getSafeScale(scale);

  return {
    x: (clientX - rect.left) / safeScale,
    y: (clientY - rect.top) / safeScale,
  };
}

export function getSceneRectForObject(
  objectElement: Element,
  sceneElement: Element,
  scale: number
): SceneRect {
  const safeScale = getSafeScale(scale);
  const objectRect = objectElement.getBoundingClientRect();
  const sceneRect = sceneElement.getBoundingClientRect();

  return {
    ...getScenePointFromPointer(
      objectRect.left,
      objectRect.top,
      sceneRect,
      scale
    ),
    width: objectRect.width / safeScale,
    height: objectRect.height / safeScale,
  };
}

function findSceneObjectId(
  elements: readonly Element[],
  sceneElement: Element
): string | null {
  for (const element of elements) {
    const objectElement = element.closest<HTMLElement>(
      SCENE_OBJECT_ID_SELECTOR
    );
    if (objectElement && sceneElement.contains(objectElement)) {
      return objectElement.getAttribute(SCENE_OBJECT_ID_ATTR);
    }
  }

  return null;
}

export function getSceneObjectIdFromPoint(
  clientX: number,
  clientY: number,
  sceneElement: Element,
  target: EventTarget | null = null,
  elementsFromPoint?: (clientX: number, clientY: number) => Element[]
): string | null {
  // Scope hit-testing to the scene's own document so scenes mounted in an
  // iframe or portal don't query the top-level document.
  const elements =
    elementsFromPoint?.(clientX, clientY) ??
    sceneElement.ownerDocument.elementsFromPoint?.(clientX, clientY) ??
    [];

  const objectId = findSceneObjectId(elements, sceneElement);
  if (objectId !== null) {
    return objectId;
  }

  // The browser already hit-tested the pointer event, so when the point scan
  // finds no in-scene hit (empty result, retargeted event) fall back to the
  // element that actually received it.
  return target instanceof Element
    ? findSceneObjectId([target], sceneElement)
    : null;
}

export function resolveSceneObjectInteraction({
  clientX,
  clientY,
  target,
  sceneElement,
  scale,
  registry,
  elementsFromPoint,
}: ResolveSceneObjectInteractionParams): SceneObjectInteraction {
  const scenePoint = getScenePointFromPointer(
    clientX,
    clientY,
    sceneElement.getBoundingClientRect(),
    scale
  );
  const objectId = getSceneObjectIdFromPoint(
    clientX,
    clientY,
    sceneElement,
    target,
    elementsFromPoint
  );
  const controller = objectId
    ? (registry?.getController(objectId) ?? null)
    : null;

  return {
    scenePoint,
    objectId,
    controller,
  };
}
