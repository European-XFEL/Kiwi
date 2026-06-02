import { act, render, waitFor } from '@testing-library/react';
import {
  BoxLayoutModel,
  Direction,
  DisplayLabelModel,
  SceneModel,
} from '@/karabo/common/api';
import { DeviceProxy, PropertyProxy } from '@/lib/binding/api';
import { SingletonContext } from '@/testing';

jest.mock('../../hooks/useSceneLoader');
jest.mock('../../hooks/useSceneScale');
jest.mock('@/store/globalAppStateStore');
jest.mock('@/store/loadedSceneStore');

jest.mock('@/features/controllers/api', () => ({
  ControllerContainer: jest.requireActual<
    typeof import('@/features/controllers/components/ControllerContainer')
  >('@/features/controllers/components/ControllerContainer')
    .ControllerContainer,
  statefulIconModelsById: {},
  bootstrapStatefulIcons: jest.fn(),
}));

// Register only the renderers needed for this test to avoid importing the
// full renderer bootstrap, which includes stateful icon setup via import.meta.
jest.mock('../../renderers', () => {
  jest.requireActual('@/features/scene-view/components/layouts/BoxLayout');
  jest.requireActual('@/features/controllers/components/display/DisplayLabel');
  return {};
});

import SceneView from '../SceneView';
import { useSceneLoader } from '../../hooks/useSceneLoader';
import { useSceneScale } from '../../hooks/useSceneScale';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { useLoadedSceneStore } from '@/store/loadedSceneStore';

const mockUseSceneLoader = jest.mocked(useSceneLoader);
const mockUseSceneScale = jest.mocked(useSceneScale);
const mockUseGlobalStore = jest.mocked(useGlobalStore);
const mockUseLoadedSceneStore = jest.mocked(useLoadedSceneStore);

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
    mockUseSceneScale.mockReturnValue(1);
    mockUseGlobalStore.mockReturnValue({ lastGlobalError: null } as any);
    mockUseLoadedSceneStore.mockReturnValue({ fitMode: 'fit-page' } as any);
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

    mockUseSceneLoader.mockReturnValue({
      scene: makeNestedLayoutScene('scene-1'),
      error: '',
    });

    await SingletonContext.run({ topology }, async () => {
      const { rerender, unmount } = render(<SceneView />);

      await waitFor(() => {
        expect(stopMonitors.get('DEV')).toHaveLength(1);
      });

      expect(stopMonitoringSpy).toHaveBeenCalledTimes(0);
      expect(disposeSpy).toHaveBeenCalledTimes(0);

      mockUseSceneLoader.mockReturnValue({
        scene: makeNestedLayoutScene('scene-2'),
        error: '',
      });

      act(() => {
        rerender(<SceneView />);
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
});
