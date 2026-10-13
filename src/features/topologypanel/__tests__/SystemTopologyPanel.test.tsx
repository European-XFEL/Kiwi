import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { Profiler } from 'react';
import { TreeApi } from 'react-arborist';
import { Capabilities, Hash } from '@/karabo/data/api';
import { SystemTopology } from '@/lib/topology/Topology';
import { Mediator } from '@/lib/singletons/Mediator';
import { Logger } from '@/lib/singletons/Logger';
import { SingletonContext } from '@/testing';
import { retrieveDefaultDeviceScene } from '@/features/project/api';
import SystemTopologyPanel from '../SystemTopologyPanel';
import { KaraboEvent } from '@/lib/events';
import { getMediator } from '@/lib/singletons/api';

jest.mock('@/features/project/api', () => ({
  retrieveDefaultDeviceScene: jest.fn(),
}));
jest.mock('@/assets/icons', () => ({
  __esModule: true,
  default: {
    host: 'host',
    yes: 'server',
    deviceClass: 'class',
    deviceInstance: 'device',
    deviceInstanceError: 'error-device',
    deviceMonitored: 'monitored',
    statusOk: 'ok',
    statusError: 'error',
    statusUnknown: 'unknown',
    python: 'python',
    cppDevelopment: 'cpp-development',
  },
}));

function entry(kind: string, id: string, attrs: Record<string, unknown> = {}) {
  const instances = new Hash();
  instances.setElement(id, new Hash(), attrs);
  return new Hash(kind, instances);
}

function initial() {
  const hash = entry('server', 'SERVER', { host: 'HOST', lang: 'python' });
  for (const [kind, id, classId] of [
    ['device', 'DEV', 'Class'],
    ['device', 'OTHER', 'Class'],
    ['macro', 'MACRO', 'Macro'],
  ]) {
    hash.merge(
      entry(kind, id, {
        host: 'HOST',
        serverId: 'SERVER',
        classId,
        capabilities: id === 'OTHER' ? 0 : Capabilities.PROVIDES_SCENES,
        status: 'ok',
      })
    );
  }
  return hash;
}

function update(topology: SystemTopology, action: string, entries: Hash) {
  const hash = new Hash();
  for (const key of ['new', 'update', 'gone']) {
    hash.set(`changes.${key}`, key === action ? entries : new Hash());
  }
  act(() => topology.updateTopology(hash));
}

function row(name: string) {
  return screen.getByText(name).closest('[role="treeitem"]') as HTMLElement;
}

let topology: SystemTopology;
let context: SingletonContext;
let logger: Logger;
let unsubscribeLogger: () => void;
let resize: ResizeObserverCallback;
const disconnect = jest.fn();
const originalResizeObserver = global.ResizeObserver;

beforeEach(() => {
  jest.clearAllMocks();
  global.ResizeObserver = class {
    constructor(callback: ResizeObserverCallback) {
      resize = callback;
    }
    observe() {}
    unobserve() {}
    disconnect = disconnect;
  };
  jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(320);
  jest.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(240);
  topology = new SystemTopology();
  logger = new Logger();
  unsubscribeLogger = logger.subscribe(() => {});
  context = new SingletonContext({
    topology,
    logger,
    mediator: new Mediator(),
    network: {
      onGetDeviceSchema: jest.fn(),
      onStartMonitoringDevice: jest.fn(),
      onStopMonitoringDevice: jest.fn(),
    },
  });
  topology.initialize(initial());
});

afterEach(() => {
  cleanup();
  topology.clear();
  unsubscribeLogger();
  context.restore();
  global.ResizeObserver = originalResizeObserver;
  jest.restoreAllMocks();
});

test('uses clickable rows without selectable text and places Service Manager above the Qt-style header', () => {
  render(<SystemTopologyPanel />);
  expect(row('DEV')).toHaveClass('cursor-pointer', 'select-none');
  const button = screen.getByRole('button', { name: 'Service Manager' });
  const header = screen.getByText('Host - Server - Class - Device');
  expect(
    button.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
});

test('selection broadcasts the topology-owned device or macro proxy and ignores namespaces', () => {
  const selected: unknown[] = [];
  const remove = getMediator().on(KaraboEvent.ShowConfiguration, (data) =>
    selected.push(data.proxy)
  );
  render(<SystemTopologyPanel />);
  fireEvent.click(row('DEV'));
  fireEvent.click(row('Class'));
  fireEvent.click(row('MACRO'));
  expect(selected).toHaveLength(2);
  expect(selected[0]).toBe(topology.getDevice('DEV'));
  expect(selected[1]).toBe(topology.getDevice('MACRO'));
  remove();
});

test('logs a device without scene capability instead of retrieving its scene', () => {
  render(<SystemTopologyPanel />);
  fireEvent.doubleClick(row('OTHER'));
  expect(retrieveDefaultDeviceScene).not.toHaveBeenCalled();
  expect(logger.getSnapshot()).toEqual([
    expect.objectContaining({
      level: 'info',
      message: 'Device "OTHER" does not provide a scene.',
    }),
  ]);
});

test('header double-click toggles all folders using the expansion boolean', () => {
  render(<SystemTopologyPanel />);
  const header = screen.getByText('Host - Server - Class - Device');
  fireEvent.doubleClick(header);
  expect(screen.getAllByRole('treeitem')).toHaveLength(1);
  expect(row('HOST')).toHaveAttribute('aria-expanded', 'false');
  fireEvent.doubleClick(header);
  expect(screen.getAllByRole('treeitem')).toHaveLength(7);
  expect(row('HOST')).toHaveAttribute('aria-expanded', 'true');
  expect(row('SERVER')).toHaveAttribute('aria-expanded', 'true');
  expect(row('Class')).toHaveAttribute('aria-expanded', 'true');
});

test('renders expanded in arrival order and retrieves only device scenes on double-click', () => {
  const getDevice = jest.spyOn(topology, 'getDevice');
  render(<SystemTopologyPanel />);
  expect(
    screen.getAllByRole('treeitem').map((element) => element.textContent)
  ).toEqual(['HOST', 'SERVER', 'Class', 'DEV', 'OTHER', 'Macro', 'MACRO']);
  expect(getDevice).not.toHaveBeenCalled();
  expect(
    within(row('SERVER')).getByRole('img', { name: 'python' })
  ).toHaveAttribute('src', 'python');
  fireEvent.click(row('DEV'));
  expect(retrieveDefaultDeviceScene).not.toHaveBeenCalled();
  fireEvent.doubleClick(row('DEV'));
  expect(retrieveDefaultDeviceScene).toHaveBeenCalledTimes(1);
  expect(retrieveDefaultDeviceScene).toHaveBeenCalledWith('DEV');
  fireEvent.doubleClick(row('MACRO'));
  expect(retrieveDefaultDeviceScene).toHaveBeenCalledTimes(1);
  fireEvent.doubleClick(row('Class'));
  expect(screen.queryByText('DEV')).toBeNull();
  fireEvent.doubleClick(row('Class'));
  expect(screen.getByText('DEV')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Service Manager' })).toBeEnabled();
});

test('status updates rerender only device decoration cells, with error taking precedence over monitoring', () => {
  const other = topology.systemTree.getInstanceNode('OTHER')!;
  const nameRead = jest.fn(() => 'OTHER');
  Object.defineProperty(other, 'name', { get: nameRead });
  render(<SystemTopologyPanel />);
  const content = screen.getByText('OTHER');
  nameRead.mockClear();
  const release = { current: () => {} };
  act(() => {
    release.current = topology.getDevice('DEV').addMonitor();
  });
  expect(
    within(row('DEV')).getByRole('img', { name: 'Device type' })
  ).toHaveAttribute('src', 'monitored');
  update(topology, 'update', entry('device', 'DEV', { status: 'error' }));
  expect(
    within(row('DEV')).getByRole('img', { name: 'Device type' })
  ).toHaveAttribute('src', 'error-device');
  expect(
    within(row('DEV')).getByRole('img', { name: 'Instance status' })
  ).toHaveAttribute('src', 'error');
  act(() => release.current());
  expect(
    within(row('DEV')).getByRole('img', { name: 'Device type' })
  ).toHaveAttribute('src', 'error-device');
  update(topology, 'update', entry('device', 'DEV', { status: 'none' }));
  expect(
    within(row('DEV')).queryByRole('img', { name: 'Instance status' })
  ).toBeNull();
  expect(screen.getByText('OTHER')).toBe(content);
  expect(nameRead).not.toHaveBeenCalled();
});

test('workspace rerenders do not reread the tree, while topology changes still render', () => {
  const snapshotRead = jest.spyOn(topology.systemTree, 'getSnapshot');
  const { rerender } = render(<SystemTopologyPanel />);
  expect(snapshotRead).toHaveBeenCalled();
  snapshotRead.mockClear();
  rerender(<SystemTopologyPanel />);
  expect(snapshotRead).not.toHaveBeenCalled();
  update(topology, 'gone', entry('device', 'DEV'));
  expect(screen.queryByText('DEV')).toBeNull();
  expect(screen.getByText('OTHER')).toBeVisible();
});

test('selection changes do not rerender device decoration cells', () => {
  const device = topology.systemTree.getInstanceNode('DEV')!;
  const status = device.status;
  const statusRead = jest.fn(() => status);
  Object.defineProperty(device, 'status', { get: statusRead });
  render(<SystemTopologyPanel />);
  statusRead.mockClear();
  fireEvent.click(row('DEV'));
  expect(row('DEV')).toHaveAttribute('aria-selected', 'true');
  expect(statusRead).not.toHaveBeenCalled();
});

test('monitoring changes do not render while the error icon takes precedence', () => {
  update(topology, 'update', entry('device', 'DEV', { status: 'error' }));
  const committed = jest.fn();
  render(
    <Profiler id="topology" onRender={committed}>
      <SystemTopologyPanel />
    </Profiler>
  );
  committed.mockClear();
  const release = { current: () => {} };
  act(() => {
    release.current = topology.getDevice('DEV').addMonitor();
  });
  act(() => release.current());
  expect(committed).not.toHaveBeenCalled();
  expect(
    within(row('DEV')).getByRole('img', { name: 'Device type' })
  ).toHaveAttribute('src', 'error-device');
});

test('restores monitoring on mount and remount and releases event listeners on unmount', () => {
  const proxy = topology.getDevice('DEV');
  const release = proxy.addMonitor();
  const structural = jest.fn();
  const unsubscribe = topology.systemTree.subscribe(structural);
  const getDevice = jest.spyOn(topology, 'getDevice');
  const { unmount } = render(<SystemTopologyPanel />);
  expect(
    within(row('DEV')).getByRole('img', { name: 'Device type' })
  ).toHaveAttribute('src', 'monitored');
  expect(getDevice).not.toHaveBeenCalled();
  const device = topology.systemTree.getInstanceNode('DEV')!;
  const decoration = jest.fn();
  const unsubscribeDecoration = device.subscribeDecoration(decoration);
  const releaseSecond = proxy.addMonitor();
  act(() => release());
  expect(device.monitoring).toBe(true);
  expect(decoration).not.toHaveBeenCalled();
  unmount();
  releaseSecond();
  expect(decoration).not.toHaveBeenCalled();
  render(<SystemTopologyPanel />);
  expect(
    within(row('DEV')).getByRole('img', { name: 'Device type' })
  ).toHaveAttribute('src', 'device');
  expect(decoration).toHaveBeenCalledTimes(1);
  expect(structural).not.toHaveBeenCalled();
  unsubscribeDecoration();
  unsubscribe();
});

test('restores monitoring for a device arriving after its monitoring event', () => {
  render(<SystemTopologyPanel />);
  const release = { current: () => {} };
  act(() => {
    release.current = topology.getDevice('LATE').addMonitor();
  });
  update(
    topology,
    'new',
    entry('device', 'LATE', {
      host: 'HOST',
      serverId: 'SERVER',
      classId: 'Class',
      capabilities: 0,
      status: 'ok',
    })
  );
  expect(
    within(row('LATE')).getByRole('img', { name: 'Device type' })
  ).toHaveAttribute('src', 'monitored');
  act(() => release.current());
  expect(
    within(row('LATE')).getByRole('img', { name: 'Device type' })
  ).toHaveAttribute('src', 'device');
});

test('monitoring events update the Arborist node without walking or rebuilding the tree', () => {
  const getNode = jest.spyOn(TreeApi.prototype, 'get');
  const rebuild = jest.spyOn(TreeApi.prototype, 'update');
  const visit = jest.spyOn(topology.systemTree, 'visit');
  render(<SystemTopologyPanel />);
  getNode.mockClear();
  rebuild.mockClear();
  visit.mockClear();
  const release = { current: () => {} };
  act(() => {
    release.current = topology.getDevice('DEV').addMonitor();
  });
  expect(getNode).toHaveBeenCalledWith('DEV');
  expect(
    within(row('DEV')).getByRole('img', { name: 'Device type' })
  ).toHaveAttribute('src', 'monitored');
  act(() => release.current());
  expect(
    within(row('DEV')).getByRole('img', { name: 'Device type' })
  ).toHaveAttribute('src', 'device');
  expect(visit).not.toHaveBeenCalled();
  expect(rebuild).not.toHaveBeenCalled();
});

test('monitoring remains current while a folder is collapsed', () => {
  render(<SystemTopologyPanel />);
  fireEvent.doubleClick(row('Class'));
  const release = { current: () => {} };
  act(() => {
    release.current = topology.getDevice('DEV').addMonitor();
  });
  expect(topology.systemTree.getInstanceNode('DEV')!.monitoring).toBe(true);
  fireEvent.doubleClick(row('Class'));
  expect(
    within(row('DEV')).getByRole('img', { name: 'Device type' })
  ).toHaveAttribute('src', 'monitored');
  fireEvent.doubleClick(row('Class'));
  act(() => release.current());
  expect(topology.systemTree.getInstanceNode('DEV')!.monitoring).toBe(false);
  fireEvent.doubleClick(row('Class'));
  expect(
    within(row('DEV')).getByRole('img', { name: 'Device type' })
  ).toHaveAttribute('src', 'device');
});

test('replacing the topology restores row monitoring from cached proxies', () => {
  const release = topology.getDevice('DEV').addMonitor();
  render(<SystemTopologyPanel />);
  act(() => topology.initialize(initial()));
  expect(
    within(row('DEV')).getByRole('img', { name: 'Device type' })
  ).toHaveAttribute('src', 'monitored');
  act(() => release());
  expect(
    within(row('DEV')).getByRole('img', { name: 'Device type' })
  ).toHaveAttribute('src', 'device');
});

test('surviving mounted content, selection, collapse state and scroll offset persist through removal', () => {
  const other = topology.systemTree.getInstanceNode('OTHER')!;
  const nameRead = jest.fn(() => 'OTHER');
  Object.defineProperty(other, 'name', { get: nameRead });
  render(<SystemTopologyPanel />);
  fireEvent.click(row('OTHER'));
  fireEvent.doubleClick(row('Macro'));
  const content = screen.getByText('OTHER');
  const scroller = screen.getByRole('tree').firstElementChild as HTMLElement;
  fireEvent.scroll(scroller, { target: { scrollTop: 12 } });
  nameRead.mockClear();
  update(topology, 'gone', entry('device', 'DEV'));
  expect(screen.getByText('OTHER')).toBe(content);
  expect(nameRead).not.toHaveBeenCalled();
  expect(row('OTHER')).toHaveAttribute('aria-selected', 'true');
  expect(row('Macro')).toHaveAttribute('aria-expanded', 'false');
  expect(scroller.scrollTop).toBe(12);
});

test('clears removed selection and moves focus to a surviving ancestor, then the container', () => {
  render(<SystemTopologyPanel />);
  fireEvent.click(row('DEV'));
  expect(row('DEV')).toHaveFocus();
  update(topology, 'gone', entry('device', 'DEV'));
  expect(row('Class')).toHaveFocus();
  expect(
    screen
      .getAllByRole('treeitem')
      .every((element) => element.getAttribute('aria-selected') === 'false')
  ).toBe(true);
  update(topology, 'gone', entry('server', 'SERVER'));
  expect(screen.getByRole('tree')).toHaveFocus();
});

test('removal does not take focus from an editor outside the tree', () => {
  render(
    <>
      <SystemTopologyPanel />
      <input aria-label="Editor" />
    </>
  );
  fireEvent.click(row('DEV'));
  const editor = screen.getByRole('textbox', { name: 'Editor' });
  act(() => editor.focus());
  update(topology, 'gone', entry('device', 'DEV'));
  expect(editor).toHaveFocus();
});

test('resizes the viewport, supports keyboard navigation and releases the observer', () => {
  const { unmount } = render(<SystemTopologyPanel />);
  const tree = screen.getByRole('tree');
  expect(tree).toHaveStyle({ width: '320px', height: '240px' });
  act(() =>
    resize(
      [{ contentRect: { width: 420, height: 360 } } as ResizeObserverEntry],
      {} as ResizeObserver
    )
  );
  expect(tree).toHaveStyle({ width: '420px', height: '360px' });
  act(() => tree.focus());
  fireEvent.keyDown(tree, { key: 'ArrowDown' });
  expect(row('SERVER')).toHaveFocus();
  fireEvent.keyDown(tree, { key: 'ArrowLeft' });
  expect(row('SERVER')).toHaveAttribute('aria-expanded', 'false');
  fireEvent.keyDown(tree, { key: 'ArrowRight' });
  expect(row('SERVER')).toHaveAttribute('aria-expanded', 'true');
  unmount();
  expect(disconnect).toHaveBeenCalled();
});
