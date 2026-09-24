import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import {
  BoxLayoutModel,
  Direction,
  DisplayLabelModel,
  LabelModel,
  RectangleModel,
  SceneModel,
  UnknownWidgetDataModel,
} from '@/karabo/common/api';
import {
  BindingRoot,
  StringBinding,
  DeviceProxy,
  PropertyProxy,
} from '@/lib/binding/api';
import { ALL_OK_COLOR } from '@/lib/colors';
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

jest.mock(
  '@/features/scene-view/components/widgets/ControllerContainer',
  () => {
    const ReactActual = jest.requireActual<typeof React>('react');
    const actualContainer = jest.requireActual<
      typeof import('@/features/scene-view/components/widgets/ControllerContainer')
    >('@/features/scene-view/components/widgets/ControllerContainer');

    return {
      ControllerContainer: (
        props: React.ComponentProps<typeof actualContainer.ControllerContainer>
      ) =>
        ReactActual.createElement(
          'div',
          { 'data-testid': 'controller-container' },
          ReactActual.createElement(actualContainer.ControllerContainer, props)
        ),
    };
  }
);

// Register only the renderers needed for these tests to avoid importing the
// full renderer bootstrap, which includes stateful icon setup via import.meta.
jest.mock('../../renderers', () => {
  jest.requireActual('@/features/scene-view/components/layouts/BoxLayout');
  jest.requireActual('@/features/scene-view/components/widgets/Label');
  jest.requireActual('@/features/scene-view/components/shapes/Rectangle');
  const { registerRenderer } = jest.requireActual<
    typeof import('@/features/scene-view/renderRegistry')
  >('@/features/scene-view/renderRegistry');
  const DisplayLabel = jest.requireActual<
    typeof import('@/features/controllers/components/display/DisplayLabel')
  >('@/features/controllers/components/display/DisplayLabel').default;

  registerRenderer('DisplayLabel', DisplayLabel);
  return {};
});

import SceneView from '../SceneView';

const makeNestedLayoutScene = (uuid: string) => {
  const scene = new SceneModel();
  scene.uuid = uuid;
  scene.width = 800;
  scene.height = 600;

  const outerLayout = new BoxLayoutModel();
  outerLayout.x = 10;
  outerLayout.y = 20;
  outerLayout.width = 180;
  outerLayout.height = 40;
  outerLayout.direction = Direction.LeftToRight;

  const innerLayout = new BoxLayoutModel();
  innerLayout.width = 180;
  innerLayout.height = 40;
  innerLayout.direction = Direction.LeftToRight;

  const child = new DisplayLabelModel();
  child.width = 180;
  child.height = 40;
  child.keys = ['DEV.speed'];

  innerLayout.children = [child];
  outerLayout.children = [innerLayout];
  scene.children = [outerLayout];

  return scene;
};

const makeMixedScene = (uuid: string) => {
  const scene = new SceneModel();
  scene.uuid = uuid;
  scene.width = 800;
  scene.height = 600;

  const shape = new RectangleModel();
  shape.x = 10;
  shape.y = 20;
  shape.width = 30;
  shape.height = 20;

  const staticLabel = new LabelModel();
  staticLabel.x = 50;
  staticLabel.y = 20;
  staticLabel.width = 120;
  staticLabel.height = 30;
  staticLabel.text = 'Static root';

  const controller = new DisplayLabelModel();
  controller.x = 190;
  controller.y = 20;
  controller.width = 120;
  controller.height = 30;
  controller.keys = ['DEV.speed'];

  const unknownWidget = new UnknownWidgetDataModel();
  unknownWidget.x = 330;
  unknownWidget.y = 20;
  unknownWidget.width = 80;
  unknownWidget.height = 30;
  unknownWidget.klass = 'MissingWidget';

  const layout = new BoxLayoutModel();
  layout.x = 10;
  layout.y = 80;
  layout.width = 260;
  layout.height = 40;
  layout.direction = Direction.LeftToRight;

  const nestedStatic = new LabelModel();
  nestedStatic.width = 120;
  nestedStatic.height = 30;
  nestedStatic.text = 'Nested static';

  const nestedController = new DisplayLabelModel();
  nestedController.width = 120;
  nestedController.height = 30;
  nestedController.keys = ['DEV.temperature'];

  layout.children = [nestedStatic, nestedController];
  scene.children = [shape, staticLabel, controller, unknownWidget, layout];

  return scene;
};

const makeTopology = () => {
  const devices = new Map<string, DeviceProxy>();
  const stopMonitors = new Map<string, jest.Mock[]>();

  return {
    stopMonitors,
    topology: {
      getDevice: jest.fn((deviceId: string) => {
        let device = devices.get(deviceId);
        if (!device) {
          device = new DeviceProxy(deviceId);
          jest.spyOn(device, 'addMonitor').mockImplementation(() => {
            const stopMonitor = jest.fn();
            const stops = stopMonitors.get(deviceId) ?? [];
            stops.push(stopMonitor);
            stopMonitors.set(deviceId, stops);
            return stopMonitor;
          });
          devices.set(deviceId, device);
        }
        return device;
      }),
    },
  };
};

describe('SceneView integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stops monitoring and disposes the old nested controller widget on scene switch, then cleans up the new scene on unmount', async () => {
    const { stopMonitors, topology } = makeTopology();
    const stopMonitoringSpy = jest.spyOn(
      PropertyProxy.prototype,
      'stopMonitoring'
    );
    const disposeSpy = jest.spyOn(PropertyProxy.prototype, 'dispose');

    await SingletonContext.run({ topology }, async () => {
      const { rerender, unmount } = render(
        <SceneView
          sceneModel={makeNestedLayoutScene('scene-1')}
          scale={1}
          fitMode="fit-page"
        />
      );

      await waitFor(() => {
        expect(stopMonitors.get('DEV')).toHaveLength(1);
      });

      expect(stopMonitoringSpy).toHaveBeenCalledTimes(0);
      expect(disposeSpy).toHaveBeenCalledTimes(0);

      act(() => {
        rerender(
          <SceneView
            sceneModel={makeNestedLayoutScene('scene-2')}
            scale={1}
            fitMode="fit-page"
          />
        );
      });

      await waitFor(() => {
        expect(stopMonitors.get('DEV')).toHaveLength(2);
      });

      expect(stopMonitors.get('DEV')?.[0]).toHaveBeenCalledTimes(1);
      expect(stopMonitors.get('DEV')?.[1]).toHaveBeenCalledTimes(0);
      expect(stopMonitoringSpy).toHaveBeenCalledTimes(1);
      expect(disposeSpy).toHaveBeenCalledTimes(1);

      unmount();

      expect(stopMonitors.get('DEV')?.[1]).toHaveBeenCalledTimes(1);
      expect(stopMonitoringSpy).toHaveBeenCalledTimes(2);
      expect(disposeSpy).toHaveBeenCalledTimes(2);
    });
  });

  it('renders each mixed root model in its eligible layer without duplicates', async () => {
    const { topology } = makeTopology();

    await SingletonContext.run({ topology }, async () => {
      const { container } = render(
        <SceneView
          sceneModel={makeMixedScene('scene-mixed')}
          scale={1}
          fitMode="fit-page"
        />
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('controller-container')).toHaveLength(2);
      });

      expect(screen.getAllByText('Static root')).toHaveLength(1);
      expect(screen.getAllByText('Nested static')).toHaveLength(1);
      expect(screen.getAllByText('Unknown widget: MissingWidget')).toHaveLength(
        1
      );
      expect(container.querySelectorAll('rect')).toHaveLength(1);
    });
  });
});

test('a standalone state label uses the default grey background', async () => {
  const { topology } = makeTopology();
  const device = topology.getDevice('DEV');
  device.binding = new BindingRoot();
  const binding = new StringBinding({ value: 'ERROR' });
  binding.displayType = 'State';
  device.binding.value!.set('state', binding);
  const scene = new SceneModel();
  scene.uuid = 'state-background';
  scene.width = 100;
  scene.height = 30;
  const label = new DisplayLabelModel();
  Object.assign(label, { width: 80, height: 20, keys: ['DEV.state'] });
  scene.children = [label];

  await SingletonContext.run({ topology }, async () => {
    const { unmount } = render(
      <SceneView sceneModel={scene} scale={1} fitMode="fit-page" />
    );
    expect(screen.getByText('ERROR').parentElement?.style.backgroundColor).toBe(
      ALL_OK_COLOR
    );
    unmount();
  });
});
