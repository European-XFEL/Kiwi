import { render, waitFor } from '@testing-library/react';

import {
  BoxLayoutModel,
  Direction,
  DisplayLabelModel,
  LabelModel,
  SceneModel,
} from '@/karabo/common/api';
import { DeviceProxy } from '@/lib/binding/api';
import { SingletonContext } from '@/testing';

jest.mock('@/features/controllers/api', () => ({
  bootstrapControllerRenderers: jest.fn(),
  bootstrapStatefulIcons: jest.fn(),
  statefulIconModelsById: {},
  getModelKeys: jest.requireActual<
    typeof import('@/features/controllers/utils/controller_semantics')
  >('@/features/controllers/utils/controller_semantics').getModelKeys,
  getQFontTextStyle: jest.fn(() => ({})),
  useContainer: jest.requireActual<
    typeof import('@/features/controllers/hooks/useContainer')
  >('@/features/controllers/hooks/useContainer').useContainer,
  useController: jest.requireActual<
    typeof import('@/features/controllers/hooks/useController')
  >('@/features/controllers/hooks/useController').useController,
  useProxies: jest.requireActual<
    typeof import('@/features/controllers/hooks/useProxies')
  >('@/features/controllers/hooks/useProxies').useProxies,
}));

jest.mock('../../renderers', () => {
  jest.requireActual('@/features/scene-view/components/layouts/BoxLayout');
  jest.requireActual('@/features/scene-view/components/widgets/Label');
  const { registerRenderer } = jest.requireActual<
    typeof import('@/features/scene-view/renderRegistry')
  >('@/features/scene-view/renderRegistry');
  const DisplayLabel = jest.requireActual<
    typeof import('@/features/controllers/components/display/DisplayLabel')
  >('@/features/controllers/components/display/DisplayLabel').default;

  registerRenderer('DisplayLabel', DisplayLabel);
  return {};
});

import { SceneControllerRegistry } from '@/features/scenepanel/SceneControllerRegistry';
import { SceneControllerRegistryProvider } from '../../contexts/SceneControllerRegistryContext';
import SceneView from '../SceneView';

const controllerObjectId = 'scene:scene-1.0.1';

const makeScene = (uuid: string) => {
  const scene = new SceneModel();
  scene.uuid = uuid;
  scene.width = 800;
  scene.height = 600;

  const layout = new BoxLayoutModel();
  layout.direction = Direction.LeftToRight;
  layout.width = 160;
  layout.height = 30;

  const staticLabel = new LabelModel();
  staticLabel.width = 80;
  staticLabel.height = 30;
  staticLabel.text = 'Static';

  const controller = new DisplayLabelModel();
  controller.width = 80;
  controller.height = 30;
  controller.keys = ['DEV.speed'];

  layout.children = [staticLabel, controller];
  scene.children = [layout];

  return scene;
};

const getControllerModel = (scene: SceneModel) =>
  (scene.children[0] as BoxLayoutModel).children[1] as DisplayLabelModel;

const makeTopology = () => {
  const devices = new Map<string, DeviceProxy>();

  return {
    topology: {
      getDevice: jest.fn((deviceId: string) => {
        let device = devices.get(deviceId);
        if (!device) {
          device = new DeviceProxy(deviceId);
          devices.set(deviceId, device);
        }
        return device;
      }),
    },
  };
};

describe('Scene controller registry integration', () => {
  it('registers mounted controllers only and unregisters them on unmount', async () => {
    const { topology } = makeTopology();
    const scene = makeScene('scene-1');
    const registry = new SceneControllerRegistry();

    await SingletonContext.run({ topology }, async () => {
      const { unmount } = render(
        <SceneControllerRegistryProvider registry={registry}>
          <SceneView sceneModel={scene} scale={1} fitMode="fit-page" />
        </SceneControllerRegistryProvider>
      );

      await waitFor(() => {
        expect(registry.getController(controllerObjectId)).toBeDefined();
      });

      expect(registry.values()).toHaveLength(1);
      expect(registry.has('scene:scene-1.0')).toBe(false);
      expect(registry.has('scene:scene-1.0.0')).toBe(false);
      expect(
        registry.getController(controllerObjectId)?.ctx.proxies
      ).toHaveLength(1);

      unmount();

      expect(registry.controllers.size).toBe(0);
    });
  });

  it('keeps the mounted controller registered when scene model references change', async () => {
    const { topology } = makeTopology();
    const scene = makeScene('scene-1');
    const nextScene = makeScene('scene-1');
    const registry = new SceneControllerRegistry();

    await SingletonContext.run({ topology }, async () => {
      const { rerender, unmount } = render(
        <SceneControllerRegistryProvider registry={registry}>
          <SceneView sceneModel={scene} scale={1} fitMode="fit-page" />
        </SceneControllerRegistryProvider>
      );

      await waitFor(() => {
        expect(registry.getController(controllerObjectId)).toBeDefined();
      });

      rerender(
        <SceneControllerRegistryProvider registry={registry}>
          <SceneView sceneModel={nextScene} scale={1} fitMode="fit-page" />
        </SceneControllerRegistryProvider>
      );

      await waitFor(() => {
        const record = registry.getController(controllerObjectId);

        expect(record?.model).toBe(getControllerModel(nextScene));
        expect(record?.ctx.proxies).toHaveLength(1);
      });

      unmount();
    });
  });
});
