import { render, waitFor } from '@testing-library/react';
import {
  BoxLayoutModel,
  Direction,
  DisplayLabelModel,
  FixedLayoutModel,
  GridLayoutModel,
} from '@/karabo/common/api';
import { DeviceProxy } from '@/lib/binding/api';
import DisplayLabel from '@/features/controllers/components/display/DisplayLabel';
import { SingletonContext } from '@/testing';

jest.mock('@/features/controllers/api', () => ({
  bootstrapControllerRenderers: jest.fn(),
  getModelKeys: jest.requireActual<
    typeof import('@/features/controllers/utils/controller_semantics')
  >('@/features/controllers/utils/controller_semantics').getModelKeys,
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
  () => ({
    ControllerContainer: jest.requireActual<
      typeof import('@/features/scene-view/components/widgets/ControllerContainer')
    >('@/features/scene-view/components/widgets/ControllerContainer')
      .ControllerContainer,
  })
);

import { renderLayerContent } from '../../../KaraboSceneWidget';
import { registerRenderer } from '../../../renderRegistry';
import '../BoxLayout';
import '../FixedLayout';
import '../GridLayout';

registerRenderer('DisplayLabel', DisplayLabel);

const mockStopMonitoring = jest.fn();
const mockStartMonitoring = jest.fn<
  ReturnType<
    typeof import('@/features/controllers/utils/controller_proxies').startMonitoring
  >,
  Parameters<
    typeof import('@/features/controllers/utils/controller_proxies').startMonitoring
  >
>(() => mockStopMonitoring);

jest.mock('@/features/controllers/utils/controller_proxies', () => {
  const actual = jest.requireActual<
    typeof import('@/features/controllers/utils/controller_proxies')
  >('@/features/controllers/utils/controller_proxies');

  return {
    ...actual,
    startMonitoring: (...args: Parameters<typeof actual.startMonitoring>) =>
      mockStartMonitoring(...args),
  };
});

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

const makeChild = () => {
  const child = new DisplayLabelModel();
  child.width = 50;
  child.height = 20;
  child.keys = ['DEV.speed'];
  return child;
};

const makeBoxLayout = () => {
  const layout = new BoxLayoutModel();
  layout.direction = Direction.LeftToRight;
  layout.children = [makeChild()];
  return layout;
};

const makeFixedLayout = () => {
  const layout = new FixedLayoutModel();
  layout.children = [makeChild()];
  return layout;
};

const makeGridLayout = () => {
  const layout = new GridLayoutModel();
  layout.children = [makeChild()];
  return layout;
};

const makeNestedLayout = (
  makeOuterLayout: () => BoxLayoutModel | FixedLayoutModel | GridLayoutModel
) => {
  const outerLayout = makeOuterLayout();
  outerLayout.children = [makeBoxLayout()];
  return outerLayout;
};

describe('layout monitoring layer propagation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStartMonitoring.mockImplementation(() => mockStopMonitoring);
  });

  it.each([
    ['BoxLayout', makeBoxLayout],
    ['FixedLayout', makeFixedLayout],
    ['GridLayout', makeGridLayout],
  ])(
    'does not start monitoring nested controller widgets in the shape pass for %s',
    async (_, makeLayout) => {
      const { topology } = makeTopology();

      await SingletonContext.run({ topology }, async () => {
        const { unmount } = render(
          <>{renderLayerContent(makeLayout(), 'shape')}</>
        );

        expect(mockStartMonitoring).not.toHaveBeenCalled();

        unmount();

        expect(mockStopMonitoring).not.toHaveBeenCalled();
      });
    }
  );

  it.each([
    ['BoxLayout', makeBoxLayout],
    ['FixedLayout', makeFixedLayout],
    ['GridLayout', makeGridLayout],
  ])(
    'starts monitoring nested controller widgets once in the widget pass for %s',
    async (_, makeLayout) => {
      const { topology } = makeTopology();

      await SingletonContext.run({ topology }, async () => {
        const { unmount } = render(
          <>{renderLayerContent(makeLayout(), 'widget')}</>
        );

        await waitFor(() => {
          expect(mockStartMonitoring).toHaveBeenCalledTimes(1);
        });

        expect(mockStopMonitoring).not.toHaveBeenCalled();

        unmount();

        expect(mockStopMonitoring).toHaveBeenCalledTimes(1);
      });
    }
  );

  it.each([
    ['BoxLayout', makeBoxLayout],
    ['FixedLayout', makeFixedLayout],
    ['GridLayout', makeGridLayout],
  ])(
    'propagates the shape pass through nested layouts for %s',
    async (_, makeOuterLayout) => {
      const { topology } = makeTopology();

      await SingletonContext.run({ topology }, async () => {
        const { unmount } = render(
          <>{renderLayerContent(makeNestedLayout(makeOuterLayout), 'shape')}</>
        );

        expect(mockStartMonitoring).not.toHaveBeenCalled();

        unmount();

        expect(mockStopMonitoring).not.toHaveBeenCalled();
      });
    }
  );

  it.each([
    ['BoxLayout', makeBoxLayout],
    ['FixedLayout', makeFixedLayout],
    ['GridLayout', makeGridLayout],
  ])(
    'propagates the widget pass through nested layouts for %s',
    async (_, makeOuterLayout) => {
      const { topology } = makeTopology();

      await SingletonContext.run({ topology }, async () => {
        const { unmount } = render(
          <>{renderLayerContent(makeNestedLayout(makeOuterLayout), 'widget')}</>
        );

        await waitFor(() => {
          expect(mockStartMonitoring).toHaveBeenCalledTimes(1);
        });

        unmount();

        expect(mockStopMonitoring).toHaveBeenCalledTimes(1);
      });
    }
  );
});
