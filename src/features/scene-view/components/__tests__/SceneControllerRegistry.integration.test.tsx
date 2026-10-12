import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import {
  BoxLayoutModel,
  Direction,
  DisplayLabelModel,
  LabelModel,
  SceneModel,
} from '@/karabo/common/api';
import { BindingRoot, DeviceProxy, DoubleBinding } from '@/lib/binding/api';
import { SingletonContext } from '@/testing';
import { PanelWrangler } from '@/lib/singletons/PanelWrangler';
import { getMediator } from '@/lib/singletons/api';
import { KaraboEvent } from '@/lib/events';

jest.mock('@/features/controllers/api', () => ({
  bootstrapControllerRenderers: jest.fn(),
  bootstrapStatefulIcons: jest.fn(),
  statefulIconModelsById: {},
  getModelKeys: jest.requireActual<
    typeof import('@/features/controllers/utils/controller_semantics')
  >('@/features/controllers/utils/controller_semantics').getModelKeys,
  getQFontTextStyle: jest.fn(() => ({})),
  useContainer: jest.requireActual<
    typeof import('@/features/controllers/useContainer')
  >('@/features/controllers/useContainer').useContainer,
  useController: jest.requireActual<
    typeof import('@/features/controllers/useController')
  >('@/features/controllers/useController').useController,
  useProxies: jest.requireActual<
    typeof import('@/features/controllers/useProxies')
  >('@/features/controllers/useProxies').useProxies,
}));

jest.mock('../../renderers', () => {
  jest.requireActual('@/features/scene-view/components/layouts/BoxLayout');
  jest.requireActual('@/features/scene-view/components/widgets/Label');
  const { registerRenderer } = jest.requireActual<
    typeof import('@/features/scene-view/renderRegistry')
  >('@/features/scene-view/renderRegistry');
  const DisplayLabel = jest.requireActual<
    typeof import('@/features/controllers/display/DisplayLabel')
  >('@/features/controllers/display/DisplayLabel').default;

  registerRenderer('DisplayLabel', DisplayLabel);
  const DisplayTrendGraph = jest.requireActual<
    typeof import('@/features/controllers/display/DisplayTrendGraph')
  >('@/features/controllers/display/DisplayTrendGraph').default;
  registerRenderer('DisplayTrendGraph', DisplayTrendGraph);
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
  it('broadcasts a derived controller from a double-click inside a nested layout and consumes the event', async () => {
    const { topology } = makeTopology();
    const device = topology.getDevice('DEV');
    const binding = new BindingRoot();
    binding.value!.set('speed', new DoubleBinding({ value: 12 }));
    device.binding = binding;
    const wrangler = new PanelWrangler();
    const registry = new SceneControllerRegistry();
    const onDoubleClick = jest.fn();
    const onOpenControllerPanel = jest.fn();
    const unsubscribe = getMediator().on(
      KaraboEvent.OpenControllerPanel,
      onOpenControllerPanel
    );
    await SingletonContext.run(
      { topology, panel_wrangler: wrangler },
      async () => {
        try {
          render(
            <div onDoubleClick={onDoubleClick}>
              <SceneControllerRegistryProvider registry={registry}>
                <SceneView
                  sceneModel={makeScene('scene-1')}
                  scale={0.5}
                  fitMode="fit-page"
                />
              </SceneControllerRegistryProvider>
            </div>
          );
          fireEvent.doubleClick(
            screen.getByTestId(`controller-${controllerObjectId}`)
          );
          expect(wrangler.getSnapshot().right.controllerPanels).toHaveLength(1);
          expect(
            wrangler.getSnapshot().right.controllerPanels[0].model.klass
          ).toBe('DisplayTrendGraph');
          expect(
            wrangler.getSnapshot().right.controllerPanels[0].model.keys
          ).toEqual(['DEV.speed']);
          expect(onOpenControllerPanel).toHaveBeenCalledTimes(1);
          expect(onOpenControllerPanel).toHaveBeenCalledWith({
            model: wrangler.getSnapshot().right.controllerPanels[0].model,
          });
          expect(onDoubleClick).not.toHaveBeenCalled();
          const panel = wrangler.getSnapshot().right.controllerPanels[0];
          fireEvent.doubleClick(
            screen.getByTestId(`controller-${controllerObjectId}`)
          );
          expect(wrangler.getSnapshot().right.controllerPanels).toEqual([
            panel,
          ]);
          expect(onOpenControllerPanel).toHaveBeenCalledTimes(2);
        } finally {
          cleanup();
          wrangler.dispose();
          unsubscribe();
        }
      }
    );
  });

  it('leaves decorative and unbound double-clicks unconsumed', async () => {
    const { topology } = makeTopology();
    const wrangler = new PanelWrangler();
    const registry = new SceneControllerRegistry();
    const onDoubleClick = jest.fn();
    const onOpenControllerPanel = jest.fn();
    const unsubscribe = getMediator().on(
      KaraboEvent.OpenControllerPanel,
      onOpenControllerPanel
    );
    await SingletonContext.run(
      { topology, panel_wrangler: wrangler },
      async () => {
        try {
          render(
            <div onDoubleClick={onDoubleClick}>
              <SceneControllerRegistryProvider registry={registry}>
                <SceneView
                  sceneModel={makeScene('scene-1')}
                  scale={1}
                  fitMode="fit-page"
                />
              </SceneControllerRegistryProvider>
            </div>
          );
          fireEvent.doubleClick(screen.getByText('Static'));
          fireEvent.doubleClick(
            screen.getByTestId(`controller-${controllerObjectId}`)
          );
          expect(wrangler.getSnapshot().right.controllerPanels).toEqual([]);
          expect(onDoubleClick).toHaveBeenCalledTimes(2);
          expect(onOpenControllerPanel).not.toHaveBeenCalled();
        } finally {
          cleanup();
          wrangler.dispose();
          unsubscribe();
        }
      }
    );
  });
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
