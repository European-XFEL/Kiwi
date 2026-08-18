import type {
  SceneControllerRecord,
  SceneControllerRegistry,
} from '@/features/scene-view/contexts/SceneControllerRegistryContext';

export function createSceneControllerRegistryMock(
  controller?: SceneControllerRecord
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
