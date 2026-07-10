import type {
  SceneControllerRecord,
  SceneControllerRegistry,
} from '../../contexts/SceneControllerRegistryContext';
import {
  getSceneObjectIdFromPoint,
  getScenePointFromPointer,
  getSceneRectForObject,
  resolveSceneObjectInteraction,
} from '../sceneObjectInteraction';

function makeRegistry(
  controller: SceneControllerRecord | undefined
): SceneControllerRegistry {
  return {
    registerController: jest.fn(),
    unregisterController: jest.fn(),
    getController: jest.fn(() => controller),
    getDirtyProxies: jest.fn(() => []),
    hasDirtyProxies: jest.fn(() => false),
    dispose: jest.fn(),
  };
}

function setRect(
  element: Element,
  rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>
): void {
  element.getBoundingClientRect = jest.fn(
    () =>
      ({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }) as DOMRect
  );
}

describe('scene object interaction utilities', () => {
  it('converts pointer client coordinates into scaled scene coordinates', () => {
    expect(getScenePointFromPointer(110, 70, { left: 10, top: 20 }, 2)).toEqual(
      { x: 50, y: 25 }
    );
  });

  it('uses scale 1 when the supplied scale is not positive', () => {
    expect(getScenePointFromPointer(110, 70, { left: 10, top: 20 }, 0)).toEqual(
      { x: 100, y: 50 }
    );
  });

  it('resolves the first scene object id from elementsFromPoint within the scene', () => {
    const scene = document.createElement('div');
    const wrapper = document.createElement('div');
    wrapper.dataset.sceneObjectId = 'scene.0';
    const child = document.createElement('button');
    wrapper.appendChild(child);
    scene.appendChild(wrapper);

    expect(getSceneObjectIdFromPoint(30, 50, scene, null, () => [child])).toBe(
      'scene.0'
    );
  });

  it('falls back to the event target when elementsFromPoint has no in-scene hit', () => {
    const scene = document.createElement('div');
    const wrapper = document.createElement('div');
    wrapper.dataset.sceneObjectId = 'scene.0';
    const child = document.createElement('button');
    wrapper.appendChild(child);
    scene.appendChild(wrapper);

    expect(getSceneObjectIdFromPoint(30, 50, scene, child, () => [])).toBe(
      'scene.0'
    );
  });

  it('skips scene object wrappers outside the current scene element', () => {
    const scene = document.createElement('div');
    const outsideWrapper = document.createElement('div');
    outsideWrapper.dataset.sceneObjectId = 'outside.0';

    expect(
      getSceneObjectIdFromPoint(30, 50, scene, null, () => [outsideWrapper])
    ).toBeNull();
  });

  it('converts an object bounding rect into scene-relative coordinates', () => {
    const scene = document.createElement('div');
    const object = document.createElement('div');
    setRect(scene, { left: 10, top: 20, width: 800, height: 600 });
    setRect(object, { left: 50, top: 80, width: 120, height: 40 });

    expect(getSceneRectForObject(object, scene, 2)).toEqual({
      x: 20,
      y: 30,
      width: 60,
      height: 20,
    });
  });

  it('resolves scene point, object id, and controller record together', () => {
    const scene = document.createElement('div');
    const wrapper = document.createElement('div');
    wrapper.dataset.sceneObjectId = 'scene.0';
    const child = document.createElement('span');
    wrapper.appendChild(child);
    scene.appendChild(wrapper);
    setRect(scene, { left: 10, top: 20, width: 800, height: 600 });

    const controller: SceneControllerRecord = {
      id: 'scene.0',
      model: {} as SceneControllerRecord['model'],
      ctx: {} as SceneControllerRecord['ctx'],
    };
    const registry = makeRegistry(controller);

    const interaction = resolveSceneObjectInteraction({
      clientX: 30,
      clientY: 50,
      target: child,
      sceneElement: scene,
      scale: 2,
      registry,
      elementsFromPoint: () => [child],
    });

    expect(interaction).toEqual({
      scenePoint: { x: 10, y: 15 },
      objectId: 'scene.0',
      controller,
    });
    expect(registry.getController).toHaveBeenCalledWith('scene.0');
  });
});
