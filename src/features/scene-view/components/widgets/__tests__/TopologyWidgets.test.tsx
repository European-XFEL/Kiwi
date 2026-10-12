import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  BoxLayoutModel,
  DeviceSceneLinkModel,
  FixedLayoutModel,
  GridLayoutModel,
  InstanceStatusModel,
} from '@/karabo/common/api';
import { Hash } from '@/karabo/data/api';
import { DeviceProxy, PropertyProxy } from '@/lib/binding/api';
import { SystemTopology } from '@/lib/topology/Topology';
import { Signal } from '@/lib/utils';
import { SingletonContext } from '@/testing';
import { SceneControllerRegistry } from '@/features/scenepanel/SceneControllerRegistry';
import { SceneControllerRegistryProvider } from '../../../contexts/SceneControllerRegistryContext';
import { KaraboSceneWidget } from '../../../KaraboSceneWidget';
import { openDeviceSceneLinkInWorkspace } from '@/features/project/api';
import '../../../renderers';

jest.mock('@/features/controllers/api', () => ({
  bootstrapControllerRenderers: jest.fn(),
  getQFontTextStyle: jest.fn(() => ({})),
}));
jest.mock('@/features/project/api', () => ({
  openDeviceSceneLinkInWorkspace: jest.fn(),
  openSceneLinkInWorkspace: jest.fn(),
}));
jest.mock('@/assets/icons', () => ({
  __esModule: true,
  default: {
    statusOk: 'statusOk.svg',
    statusError: 'statusError.svg',
    statusUnknown: 'statusUnknown.svg',
    statusOffline: 'statusOffline.svg',
    deviceOffline: 'offline-32x32.png',
  },
}));

function entries(kind: string, status?: string) {
  const hash = new Hash();
  hash.setElement(
    `${kind}.DEV`,
    new Hash(),
    status === undefined ? {} : { status }
  );
  return hash;
}

function update(topology: SystemTopology, action: string, hash: Hash) {
  const changes = new Hash();
  for (const key of ['new', 'update', 'gone']) {
    changes.set(`changes.${key}`, key === action ? hash : new Hash());
  }
  act(() => topology.updateTopology(changes));
}

afterEach(() => jest.restoreAllMocks());

test.each([InstanceStatusModel, DeviceSceneLinkModel])(
  'cleans up topology subscriptions on device changes and unmount for %s',
  async (Model) => {
    const topology = new SystemTopology();
    const oldProxy = topology.getDevice('DEV');
    const newProxy = topology.getDevice('OTHER');
    const cleanups: jest.Mock[] = [];
    const owners: WeakRef<object>[] = [];
    function trackSignal<T extends unknown[]>(signal: Signal<T>) {
      const subscribe = signal.subscribe.bind(signal);
      jest.spyOn(signal, 'subscribe').mockImplementation((owner, handler) => {
        owners.push(new WeakRef(owner));
        const stop = subscribe(owner, handler);
        const cleanup = jest.fn(stop);
        cleanups.push(cleanup);
        return cleanup;
      });
    }
    for (const proxy of [oldProxy, newProxy]) {
      trackSignal(proxy.status_update);
      trackSignal(proxy.instance_status_update);
    }
    const model = new Model();
    model.keys = ['DEV.state'];
    const nextModel = new Model();
    nextModel.keys = ['OTHER.state'];
    await SingletonContext.run({ topology }, async () => {
      const { rerender, unmount } = render(
        <KaraboSceneWidget model={model} objectId="widget" />
      );
      const oldCleanups = [...cleanups];
      expect(oldCleanups.length).toBeGreaterThan(0);
      // A later event-loop turn permits GC to collect weakly held owners.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      global.gc?.();
      expect(owners.every((owner) => owner.deref() !== undefined)).toBe(true);
      rerender(<KaraboSceneWidget model={nextModel} objectId="widget" />);
      for (const stop of oldCleanups) {
        expect(stop).toHaveBeenCalledTimes(1);
      }
      const newCleanups = cleanups.slice(oldCleanups.length);
      expect(newCleanups.length).toBeGreaterThan(0);
      for (const stop of newCleanups) {
        expect(stop).not.toHaveBeenCalled();
      }
      unmount();
      for (const stop of cleanups) {
        expect(stop).toHaveBeenCalledTimes(1);
      }
    });
  }
);

test.each(['device', 'macro'])(
  'renders %s topology transitions without configuration updates',
  async (kind) => {
    const topology = new SystemTopology();
    const model = new InstanceStatusModel();
    Object.assign(model, {
      keys: ['DEV.state', 'OTHER.state'],
      width: 60,
      height: 40,
      x: 4,
      y: 5,
    });
    const addMonitor = jest.spyOn(DeviceProxy.prototype, 'addMonitor');
    await SingletonContext.run({ topology }, () => {
      const { unmount } = render(
        <KaraboSceneWidget model={model} objectId="status" />
      );
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('title', 'DEV - OFFLINE');
      expect(image).toHaveAttribute('src', 'statusOffline.svg');
      expect(image).toHaveStyle({
        width: '100%',
        height: '100%',
        cursor: 'default',
      });
      expect(image.parentElement).toHaveStyle({
        left: '4px',
        top: '5px',
        width: '60px',
        height: '40px',
      });
      act(() => topology.initialize(entries(kind, 'ok')));
      expect(image).toHaveAttribute('src', 'statusOk.svg');
      expect(image).toHaveAttribute('title', 'DEV - OK');
      update(topology, 'update', entries(kind, 'error'));
      expect(image).toHaveAttribute('src', 'statusError.svg');
      expect(image).toHaveAttribute('title', 'DEV - ERROR');
      update(topology, 'update', entries(kind));
      expect(image).toHaveAttribute('title', 'DEV - ERROR');
      update(topology, 'update', entries(kind, 'unexpected'));
      expect(image).toHaveAttribute('src', 'statusUnknown.svg');
      expect(image).toHaveAttribute('title', 'DEV - UNKNOWN');
      update(topology, 'update', entries(kind, 'none'));
      expect(image).toHaveAttribute('src', 'statusOffline.svg');
      expect(image).toHaveAttribute('title', 'DEV - NONE');
      update(topology, 'gone', entries(kind));
      expect(image).toHaveAttribute('title', 'DEV - OFFLINE');
      update(topology, 'new', entries(kind, 'ok'));
      expect(image).toHaveAttribute('title', 'DEV - OK');
      act(() => topology.clear());
      expect(image).toHaveAttribute('title', 'DEV - OFFLINE');
      expect(addMonitor).not.toHaveBeenCalled();
      unmount();
    });
  }
);

test.each([undefined, '', 'DEV', 'DEV.state'])(
  'resolves first key %s safely',
  async (key) => {
    const topology = new SystemTopology();
    const getDevice = jest.spyOn(topology, 'getDevice');
    const model = new InstanceStatusModel();
    model.keys = key === undefined ? [] : [key];
    await SingletonContext.run({ topology }, () => {
      const { unmount } = render(
        <KaraboSceneWidget model={model} objectId="status" />
      );
      const deviceId = key ? 'DEV' : '';
      expect(screen.getByRole('img')).toHaveAttribute(
        'title',
        `${deviceId} - OFFLINE`
      );
      if (key) {
        expect(getDevice).toHaveBeenCalledWith('DEV');
      } else {
        expect(getDevice).not.toHaveBeenCalled();
      }
      unmount();
    });
  }
);

test.each([BoxLayoutModel, FixedLayoutModel, GridLayoutModel])(
  'bypasses controllers and monitoring inside %s',
  async (Layout) => {
    const topology = new SystemTopology();
    topology.initialize(entries('device', 'ok'));
    const network = {
      onGetDeviceSchema: jest.fn(),
      onGetDeviceConfiguration: jest.fn(),
      onStartMonitoringDevice: jest.fn(),
      onStopMonitoringDevice: jest.fn(),
    };
    const registry = new SceneControllerRegistry();
    const status = new InstanceStatusModel();
    status.keys = ['DEV.state'];
    const link = new DeviceSceneLinkModel();
    Object.assign(link, {
      keys: ['DEV.availableScenes'],
      target: 'scene-a',
      text: 'Open',
    });
    const layout = new Layout();
    layout.children = [status, link];
    const addMonitor = jest.spyOn(DeviceProxy.prototype, 'addMonitor');
    const startMonitoring = jest.spyOn(
      PropertyProxy.prototype,
      'startMonitoring'
    );
    const getBinding = jest.spyOn(DeviceProxy.prototype, 'getBinding');
    await SingletonContext.run({ topology, network }, () => {
      const { unmount } = render(
        <SceneControllerRegistryProvider registry={registry}>
          <KaraboSceneWidget model={layout} objectId="layout" />
        </SceneControllerRegistryProvider>
      );
      expect(screen.getByTitle('DEV - OK')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute(
        'title',
        'DEV|scene-a'
      );
      expect(screen.queryByTestId('offline-overlay')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('missing-property-badge')
      ).not.toBeInTheDocument();
      expect(registry.values()).toHaveLength(0);
      expect(addMonitor).not.toHaveBeenCalled();
      expect(startMonitoring).not.toHaveBeenCalled();
      expect(getBinding).not.toHaveBeenCalled();
      for (const request of Object.values(network)) {
        expect(request).not.toHaveBeenCalled();
      }
      unmount();
    });
  }
);

test('DeviceSceneLink updates its offline indicator and preserves navigation while offline', async () => {
  const topology = new SystemTopology();
  const model = new DeviceSceneLinkModel();
  Object.assign(model, {
    keys: ['DEV.availableScenes'],
    target: 'scene-a',
    text: 'Open',
  });
  await SingletonContext.run({ topology }, () => {
    const { unmount } = render(
      <KaraboSceneWidget model={model} objectId="link" />
    );
    const button = screen.getByRole('button', { name: 'Open' });
    expect(button).toHaveAttribute('title', 'DEV|scene-a');
    const indicator = screen.getByAltText('Device offline');
    expect(indicator).toHaveAttribute('src', 'offline-32x32.png');
    expect(indicator).toHaveStyle({
      width: '16px',
      height: '16px',
      pointerEvents: 'none',
    });
    fireEvent.click(button);
    expect(openDeviceSceneLinkInWorkspace).toHaveBeenCalledWith(
      'DEV',
      'scene-a'
    );
    act(() => topology.initialize(entries('device', 'ok')));
    expect(screen.queryByAltText('Device offline')).not.toBeInTheDocument();
    update(topology, 'gone', entries('device'));
    expect(screen.getByAltText('Device offline')).toBeInTheDocument();
    unmount();
  });
});
