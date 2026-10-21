import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { Profiler } from 'react';
import userEvent from '@testing-library/user-event';
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

function find(text: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Find' }), {
    target: { value: text },
  });
}

function applyFilter() {
  fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
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
  expect(screen.queryByRole('combobox')).toBeNull();
  const button = screen.getByRole('button', { name: 'Service Manager' });
  const header = screen.getByText('Host - Server - Class - Device');
  expect(
    button.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
});

test('single and repeated clicks broadcast the topology-owned device or macro proxy and ignore namespaces', () => {
  const selected: unknown[] = [];
  const remove = getMediator().on(KaraboEvent.ShowConfiguration, (data) =>
    selected.push(data.proxy)
  );
  render(<SystemTopologyPanel />);
  fireEvent.click(row('DEV'));
  fireEvent.click(row('DEV'));
  fireEvent.click(row('Class'));
  fireEvent.click(row('MACRO'));
  expect(selected).toHaveLength(3);
  expect(selected[0]).toBe(topology.getDevice('DEV'));
  expect(selected[1]).toBe(topology.getDevice('DEV'));
  expect(selected[2]).toBe(topology.getDevice('MACRO'));
  expect(retrieveDefaultDeviceScene).not.toHaveBeenCalled();
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

test('header double-click toggles all folders using current expansion', () => {
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

test.each([false, true])(
  'header toggles current expansion across filtering and clearing with unfiltered collapse %s',
  (collapsed) => {
    render(<SystemTopologyPanel />);
    const header = screen.getByText('Host - Server - Class - Device');
    if (collapsed) {
      fireEvent.doubleClick(header);
    }
    find('dev');
    applyFilter();
    expect(screen.getAllByRole('treeitem')).toHaveLength(4);
    fireEvent.doubleClick(header);
    expect(screen.getAllByRole('treeitem')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Clear Filter' }));
    expect(screen.getAllByRole('treeitem')).toHaveLength(1);
    fireEvent.doubleClick(header);
    expect(screen.getAllByRole('treeitem')).toHaveLength(7);
  }
);

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

test('removed rows leave no visible selection and tree entry focuses the first remaining row', () => {
  render(<SystemTopologyPanel />);
  fireEvent.click(row('DEV'));
  update(topology, 'gone', entry('device', 'DEV'));
  expect(screen.queryByText('DEV')).toBeNull();
  expect(
    screen
      .getAllByRole('treeitem')
      .every((element) => element.getAttribute('aria-selected') === 'false')
  ).toBe(true);
  act(() => screen.getByRole('tree').focus());
  expect(row('HOST')).toHaveFocus();
  update(topology, 'gone', entry('server', 'SERVER'));
  expect(screen.queryAllByRole('treeitem')).toHaveLength(0);
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

test('keeps draft edits separate, applies mixed-case text on Filter or Enter and collapses on clear', async () => {
  const user = userEvent.setup();
  render(<SystemTopologyPanel />);
  fireEvent.doubleClick(row('Macro'));
  find('dEv');
  expect(screen.getByText('OTHER')).toBeVisible();
  expect(screen.getByRole('textbox', { name: 'Find' })).toHaveStyle({
    backgroundColor: 'rgba(0, 170, 255, 0.5)',
  });
  applyFilter();
  expect(
    screen.getByRole('textbox', { name: 'Find' }).style.backgroundColor
  ).toBe('');
  expect(screen.queryByText('OTHER')).toBeNull();
  expect(
    screen.getAllByRole('treeitem').map((node) => node.textContent)
  ).toEqual(['HOST', 'SERVER', 'Class', 'DEV']);
  find('other');
  await user.click(screen.getByRole('textbox', { name: 'Find' }));
  await user.keyboard('{Enter}');
  expect(screen.getByText('OTHER')).toBeVisible();
  expect(screen.queryByText('DEV')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Clear Filter' }));
  expect(screen.getByRole('textbox', { name: 'Find' })).toHaveValue('');
  expect(screen.getAllByRole('treeitem')).toHaveLength(1);
  expect(row('HOST')).toHaveAttribute('aria-expanded', 'false');
});

test.each(['Filter', 'Enter'])(
  'empty %s expands without filtering and repeated Clear collapses',
  async (action) => {
    const user = userEvent.setup();
    render(<SystemTopologyPanel />);
    const clear = screen.getByRole('button', { name: 'Clear Filter' });
    fireEvent.click(clear);
    expect(screen.getAllByRole('treeitem')).toHaveLength(1);
    if (action === 'Enter') {
      await user.click(screen.getByRole('textbox', { name: 'Find' }));
      await user.keyboard('{Enter}');
    } else {
      applyFilter();
    }
    expect(screen.getAllByRole('treeitem')).toHaveLength(7);
    fireEvent.click(clear);
    expect(screen.getAllByRole('treeitem')).toHaveLength(1);
    fireEvent.doubleClick(screen.getByText('Host - Server - Class - Device'));
    expect(screen.getAllByRole('treeitem')).toHaveLength(7);
    fireEvent.click(clear);
    expect(screen.getAllByRole('treeitem')).toHaveLength(1);
  }
);

test('passes the complete source and search options to Arborist for applied filters', () => {
  const updateTree = jest.spyOn(TreeApi.prototype, 'update');
  render(<SystemTopologyPanel />);
  find('dev');
  applyFilter();
  const props = updateTree.mock.calls.at(-1)![0];
  expect(props.data).toBe(topology.systemTree.getSnapshot());
  expect(props.searchTerm).toBe('dev');
  expect(typeof props.searchMatch).toBe('function');
  expect(screen.getByText('DEV')).toBeVisible();
  expect(screen.queryByText('OTHER')).toBeNull();
});

test.each([
  ['Class', ['HOST', 'SERVER', 'Class', 'DEV', 'OTHER']],
  ['SERVER', ['HOST', 'SERVER', 'Class', 'DEV', 'OTHER', 'Macro', 'MACRO']],
  ['macro', ['HOST', 'SERVER', 'Macro', 'MACRO']],
])(
  'includes descendants of matching folders and retains ancestors: %s',
  (text, visible) => {
    render(<SystemTopologyPanel />);
    find(text);
    applyFilter();
    expect(
      screen.getAllByRole('treeitem').map((node) => node.textContent)
    ).toEqual(visible);
  }
);

test.each([
  ['.*', []],
  [' DEV ', ['HOST', 'SERVER', 'Class', 'DEV']],
  [' ', ['HOST', 'SERVER', 'Class', 'DEV', 'OTHER', 'Macro', 'MACRO']],
])(
  'matches literal text with native whitespace trimming: %s',
  (text, visible) => {
    render(<SystemTopologyPanel />);
    find(text);
    applyFilter();
    expect(
      screen.queryAllByRole('treeitem').map((node) => node.textContent)
    ).toEqual(visible);
  }
);

test('keeps selected devices retained while their class is collapsed during a status batch', async () => {
  render(<SystemTopologyPanel />);
  find('dev');
  applyFilter();
  fireEvent.click(row('DEV'));
  fireEvent.doubleClick(row('Class'));
  const patch = entry('device', 'OTHER', { status: 'error' });
  patch.merge(entry('macro', 'MACRO', { status: 'error' }));
  update(topology, 'update', patch);
  fireEvent.doubleClick(row('Class'));
  expect(row('DEV')).toHaveAttribute('aria-selected', 'true');
});

test('highlights draft text and clears highlights on revert, apply and clear', () => {
  render(<SystemTopologyPanel />);
  const input = screen.getByRole('textbox', { name: 'Find' });
  find('DEV');
  expect(input).toHaveStyle({ backgroundColor: 'rgba(0, 170, 255, 0.5)' });
  find('');
  expect(input.style.backgroundColor).toBe('');
  find('DEV');
  applyFilter();
  expect(input.style.backgroundColor).toBe('');
  find('OTHER');
  expect(input).toHaveStyle({ backgroundColor: 'rgba(0, 170, 255, 0.5)' });
  fireEvent.click(screen.getByRole('button', { name: 'Clear Filter' }));
  expect(input.style.backgroundColor).toBe('');
});

test('keeps text-filtered membership and live icons through status updates, collapse and resize', async () => {
  update(topology, 'update', entry('device', 'OTHER', { status: 'error' }));
  render(<SystemTopologyPanel />);
  find('dev');
  applyFilter();
  fireEvent.click(row('DEV'));
  update(topology, 'update', entry('device', 'DEV', { status: 'error' }));
  update(topology, 'update', entry('device', 'OTHER', { status: 'ok' }));
  expect(row('DEV')).toHaveFocus();
  expect(row('DEV')).toHaveAttribute('aria-selected', 'true');
  expect(
    within(row('DEV')).getByRole('img', { name: 'Instance status' })
  ).toHaveAttribute('src', 'error');
  expect(screen.queryByText('OTHER')).toBeNull();
  fireEvent.doubleClick(row('Class'));
  fireEvent.doubleClick(row('Class'));
  act(() =>
    resize(
      [{ contentRect: { width: 420, height: 360 } } as ResizeObserverEntry],
      {} as ResizeObserver
    )
  );
  expect(screen.getByText('DEV')).toBeVisible();
  expect(screen.queryByText('OTHER')).toBeNull();
  applyFilter();
  expect(screen.getByText('DEV')).toBeVisible();
  expect(screen.queryByText('OTHER')).toBeNull();
});

test('keeps filters applied through arrivals, removals and topology replacement', async () => {
  render(<SystemTopologyPanel />);
  find('late');
  applyFilter();
  expect(screen.queryAllByRole('treeitem')).toHaveLength(0);
  update(
    topology,
    'new',
    entry('device', 'LATE', {
      host: 'HOST',
      serverId: 'SERVER',
      classId: 'Class',
      capabilities: 0,
      status: 'error',
    })
  );
  expect(screen.getByText('LATE')).toBeVisible();
  update(topology, 'gone', entry('device', 'LATE'));
  expect(screen.queryAllByRole('treeitem')).toHaveLength(0);
  const replacement = initial();
  replacement.merge(
    entry('macro', 'LATE', {
      host: 'HOST',
      serverId: 'SERVER',
      classId: 'Macro',
      capabilities: 0,
      status: 'error',
    })
  );
  act(() => topology.initialize(replacement));
  expect(screen.getByText('LATE')).toBeVisible();
  expect(screen.queryByText('DEV')).toBeNull();
});

test('retains hidden selection when filtering and restores it when the row is visible again', () => {
  render(<SystemTopologyPanel />);
  fireEvent.click(row('DEV'));
  find('other');
  applyFilter();
  expect(screen.queryByText('DEV')).toBeNull();
  expect(row('OTHER')).toHaveAttribute('aria-selected', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Clear Filter' }));
  applyFilter();
  expect(row('DEV')).toHaveAttribute('aria-selected', 'true');
});

test('applying a filter and live updates leave focus in the filter controls', async () => {
  const user = userEvent.setup();
  render(<SystemTopologyPanel />);
  fireEvent.click(row('DEV'));
  const input = screen.getByRole('textbox', { name: 'Find' });
  await user.click(input);
  await user.type(input, 'other{Enter}');
  expect(input).toHaveFocus();
  expect(row('OTHER')).toHaveAttribute('aria-selected', 'false');
  act(() => screen.getByRole('tree').focus());
  expect(row('HOST')).toHaveFocus();
  act(() => input.focus());
  update(topology, 'gone', entry('device', 'OTHER'));
  expect(input).toHaveFocus();
});

test('skips search setup with no filter and after clearing the filter', async () => {
  const visit = jest.spyOn(topology.systemTree, 'visit');
  const rebuild = jest.spyOn(TreeApi.prototype, 'update');
  render(<SystemTopologyPanel />);
  expect(visit).not.toHaveBeenCalled();
  expect(rebuild.mock.lastCall![0].searchTerm).toBe('');
  expect(rebuild.mock.lastCall![0].searchMatch).toBeUndefined();
  find('dev');
  applyFilter();
  expect(screen.queryByText('OTHER')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Clear Filter' }));
  visit.mockClear();
  expect(screen.queryByText('OTHER')).toBeNull();
  applyFilter();
  expect(screen.getByText('OTHER')).toBeVisible();
  expect(visit).not.toHaveBeenCalled();
  expect(rebuild.mock.lastCall![0].searchTerm).toBe('');
  expect(rebuild.mock.lastCall![0].searchMatch).toBeUndefined();
});

test('status and monitoring updates do not rebuild the tree with an applied or cleared filter', () => {
  const rebuild = jest.spyOn(TreeApi.prototype, 'update');
  render(<SystemTopologyPanel />);
  find('dev');
  applyFilter();
  rebuild.mockClear();
  act(() => topology.systemTree.setMonitoring('DEV', true));
  update(topology, 'update', entry('device', 'DEV', { log: 'DEBUG' }));
  expect(rebuild).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Clear Filter' }));
  rebuild.mockClear();
  update(topology, 'update', entry('device', 'DEV', { status: 'error' }));
  expect(rebuild).not.toHaveBeenCalled();
});

test.each(['Filter', 'Enter'])(
  'reapplying a folder filter with %s expands its descendants',
  async (action) => {
    const user = userEvent.setup();
    render(<SystemTopologyPanel />);
    fireEvent.doubleClick(row('Class'));
    find('Class');
    applyFilter();
    expect(screen.getByText('DEV')).toBeVisible();
    expect(screen.getByText('OTHER')).toBeVisible();
    fireEvent.doubleClick(row('Class'));
    expect(screen.queryByText('DEV')).toBeNull();
    if (action === 'Enter') {
      await user.click(screen.getByRole('textbox', { name: 'Find' }));
      await user.keyboard('{Enter}');
    } else {
      applyFilter();
    }
    expect(screen.getByText('DEV')).toBeVisible();
    expect(screen.getByText('OTHER')).toBeVisible();
    fireEvent.doubleClick(row('Class'));
    find('dev');
    applyFilter();
    expect(screen.getByText('DEV')).toBeVisible();
    expect(screen.queryByText('OTHER')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Filter' }));
    expect(row('HOST')).toHaveAttribute('aria-expanded', 'false');
  }
);

test('status batches do not apply draft text or rebuild the tree before Enter', async () => {
  const user = userEvent.setup();
  render(<SystemTopologyPanel />);
  find('missing');
  applyFilter();
  find('dev');
  const rebuild = jest.spyOn(TreeApi.prototype, 'update');
  rebuild.mockClear();
  const patch = entry('device', 'DEV', { status: 'error' });
  patch.merge(entry('device', 'OTHER', { status: 'error' }));
  update(topology, 'update', patch);
  expect(screen.queryByText('DEV')).toBeNull();
  expect(screen.queryByText('OTHER')).toBeNull();
  expect(rebuild).not.toHaveBeenCalled();
  await user.click(screen.getByRole('textbox', { name: 'Find' }));
  await user.keyboard('{Enter}');
  expect(screen.getByText('DEV')).toBeVisible();
  expect(screen.queryByText('OTHER')).toBeNull();
});
