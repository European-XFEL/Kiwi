import { StrictMode } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { AccessLevel, Hash, HashAttributes } from '@/karabo/data/api';
import {
  BaseBinding,
  BoolBinding,
  ByteArrayBinding,
  DeviceProxy,
  Int32Binding,
  NodeBinding,
  StringBinding,
  VectorBoolBinding,
  VectorInt32Binding,
  VectorHashBinding,
  ProxyStatus,
} from '@/lib/binding/api';
import { SlotBinding } from '@/lib/binding/BaseBinding';
import { DisplayTrendGraphModel } from '@/karabo/common/api';
import { broadcast_event, KaraboEvent } from '@/lib/events';
import { Mediator } from '@/lib/singletons/Mediator';
import { SingletonContext } from '@/testing';
import { useGlobalStore } from '@/store/api';
import { ERROR_COLOR_ALPHA, UNKNOWN_COLOR_ALPHA, OK_COLOR } from '@/lib/colors';
import { getStateColor } from '@/lib/Indicators';
import * as renderRegistry from '@/features/scene-view/renderRegistry';
import ConfigurationPanel from '../ConfigurationPanel';
import ConfigurationTree from '../components/ConfigurationTree';
import { ConfigurationTreeModel } from '../ConfigurationTreeModel';
import * as utils from '../utils';

jest.mock('@/assets/icons', () => ({ __esModule: true, default: {} }));

let context: SingletonContext;
let root: DeviceProxy;
let mediator: Mediator;
const network = {
  onExecute: jest.fn(),
  onGetDeviceSchema: jest.fn(),
  onStartMonitoringDevice: jest.fn(),
  onStopMonitoringDevice: jest.fn(),
};
const originalResizeObserver = global.ResizeObserver;

function row(name: string) {
  return screen.getByText(name).closest('[role="treeitem"]') as HTMLElement;
}
function middle(name: string) {
  return within(row(name)).getByTestId('current-value');
}
function show(proxy: DeviceProxy | undefined = root) {
  act(() => broadcast_event(KaraboEvent.ShowConfiguration, { proxy }));
}
function add(name: string, binding: BaseBinding) {
  root.binding.value!.set(name, binding);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600);
  jest.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400);
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  mediator = new Mediator();
  root = new DeviceProxy('DEV');
  root.isOnline = true;
  root.status = ProxyStatus.SCHEMA;
  context = new SingletonContext({
    mediator,
    network,
    topology: { isMacro: () => false },
  });
  useGlobalStore.setState({
    sessionInfo: { accessLevel: AccessLevel.OPERATOR } as never,
  });
  add(
    'state',
    new StringBinding({
      value: 'ACTIVE',
      attributes: new HashAttributes({ displayType: 'State' }),
    })
  );
});
afterEach(() => {
  cleanup();
  context.restore();
  global.ResizeObserver = originalResizeObserver;
  jest.restoreAllMocks();
  useGlobalStore.getState().reset();
});

test('renders three aligned columns, Qt values and units with a blank inert Value column', () => {
  add('boolean', new BoolBinding({ value: true }));
  add('vector', new VectorInt32Binding({ value: new Int32Array([1, 2]) }));
  add('flags', new VectorBoolBinding({ value: [true, false] }));
  add(
    'hex',
    new Int32Binding({
      value: 255,
      attributes: new HashAttributes({ displayType: 'hex' }),
    })
  );
  const reading = new Int32Binding({ value: 12 });
  reading.unit_label = 'mm';
  add('reading', reading);
  add('bytes', new ByteArrayBinding({ value: new Uint8Array([1, 2]) }));
  add('table', new VectorHashBinding());
  render(<ConfigurationPanel />);
  expect(
    screen.getByText('Select a device to view its configuration.')
  ).toBeInTheDocument();
  show();
  expect(screen.getByText('Property')).toBeInTheDocument();
  expect(screen.getByText('Current value on device')).toBeInTheDocument();
  expect(screen.getByText('Value')).toBeInTheDocument();
  expect(middle('boolean')).toHaveTextContent('True');
  expect(middle('vector')).toHaveTextContent('[1 2]');
  expect(middle('flags')).toHaveTextContent('[ True False]');
  expect(middle('hex')).toHaveTextContent('0xff');
  expect(middle('reading')).toHaveTextContent('12 mm');
  expect(middle('bytes')).toBeEmptyDOMElement();
  expect(
    within(middle('table')).getByRole('button', { name: 'Table' })
  ).toBeEnabled();
  const blank = within(row('reading')).getByTestId('edit-value');
  expect(blank).toBeEmptyDOMElement();
  fireEvent.doubleClick(blank);
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

test('executes slots only while online with permitted state and access, and isolates middle double clicks', () => {
  add(
    'start',
    new SlotBinding({
      attributes: new HashAttributes({
        allowedStates: ['ACTIVE'],
        requiredAccessLevel: AccessLevel.OPERATOR,
      }),
    })
  );
  render(<ConfigurationPanel />);
  show();
  const button = screen.getByRole('button', { name: 'start' });
  expect(button).toBeEnabled();
  fireEvent.click(button);
  expect(network.onExecute).toHaveBeenCalledWith('DEV', 'start', false);
  fireEvent.doubleClick(middle('start'));
  expect(network.onExecute).toHaveBeenCalledTimes(1);
  act(() => root.handleDeviceConfiguration(new Hash('state', 'ERROR')));
  expect(button).toBeDisabled();
  act(() => root.handleDeviceConfiguration(new Hash('state', 'ACTIVE')));
  act(() =>
    useGlobalStore.setState({
      sessionInfo: { accessLevel: AccessLevel.OBSERVER } as never,
    })
  );
  expect(button).toBeDisabled();
});

test('uses state background at half opacity and tints other cells, including groups', () => {
  add('group', new NodeBinding());
  add('reading', new Int32Binding({ value: 1 }));
  render(<ConfigurationPanel />);
  show();
  expect(middle('reading')).toHaveStyle({ backgroundColor: OK_COLOR });
  for (const [state, color] of [
    ['ERROR', ERROR_COLOR_ALPHA],
    ['UNKNOWN', UNKNOWN_COLOR_ALPHA],
  ]) {
    act(() => root.handleDeviceConfiguration(new Hash('state', state)));
    expect(middle('state')).toHaveStyle({
      backgroundColor: getStateColor(state).replace(',1)', ',0.5)'),
    });
    expect(middle('reading')).toHaveStyle({ backgroundColor: color });
    expect(middle('group')).toHaveStyle({ backgroundColor: color });
    expect(middle('state').style.opacity).toBe('');
  }
});

test('opens the derived controller for nested and uninitialized properties without toggling branches', () => {
  const renderer = jest
    .spyOn(renderRegistry, 'getRenderer')
    .mockReturnValue(undefined);
  const group = new NodeBinding();
  group.value.set('reading', new Int32Binding());
  add('group', group);
  add('unsupported', new BaseBinding());
  const opened: DisplayTrendGraphModel[] = [];
  const remove = mediator.on(KaraboEvent.OpenControllerPanel, ({ model }) =>
    opened.push(model)
  );
  render(<ConfigurationPanel />);
  show();
  expect(row('group')).toHaveAttribute('aria-expanded', 'false');
  fireEvent.doubleClick(middle('group'));
  expect(row('group')).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Expand group' }));
  fireEvent.doubleClick(middle('reading'));
  expect(opened).toHaveLength(1);
  expect(opened[0]).toBeInstanceOf(DisplayTrendGraphModel);
  expect(opened[0].keys).toEqual(['DEV.group.reading']);
  expect(row('group')).toHaveAttribute('aria-expanded', 'true');
  fireEvent.doubleClick(middle('unsupported'));
  expect(opened).toHaveLength(1);
  expect(renderer).not.toHaveBeenCalled();
  remove();
});

test('preserves surviving expansion and selection across schema changes, resets on device changes', () => {
  const group = new NodeBinding();
  group.value.set('reading', new Int32Binding());
  add('group', group);
  render(<ConfigurationPanel />);
  show();
  fireEvent.click(screen.getByRole('button', { name: 'Expand group' }));
  fireEvent.click(row('reading'));
  group.value.set('added', new StringBinding());
  act(() => root.schema_update.fire());
  expect(row('group')).toHaveAttribute('aria-expanded', 'true');
  expect(row('reading')).toHaveAttribute('aria-selected', 'true');
  group.value.clear_namespace();
  act(() => root.schema_update.fire());
  expect(screen.queryByText('reading')).not.toBeInTheDocument();
  add('group', new StringBinding());
  act(() => root.schema_update.fire());
  expect(row('group')).toHaveAttribute('aria-expanded', 'false');
  expect(
    screen.queryByRole('button', { name: 'Collapse group' })
  ).not.toBeInTheDocument();
  const other = new DeviceProxy('OTHER');
  other.isOnline = true;
  other.status = ProxyStatus.SCHEMA;
  other.binding.value!.set('group', group);
  show(other);
  expect(row('group')).toHaveAttribute('aria-expanded', 'false');
  expect(row('group')).toHaveAttribute('aria-selected', 'false');
});

test('preserves selection inside collapsed groups on schema refresh and clears filtered selection', () => {
  const group = new NodeBinding();
  group.value.set(
    'expert',
    new StringBinding({
      attributes: new HashAttributes({
        requiredAccessLevel: AccessLevel.EXPERT,
      }),
    })
  );
  add('group', group);
  render(<ConfigurationPanel />);
  show();
  const visibility = screen.getByRole('combobox', {
    name: 'Configuration visibility',
  });
  fireEvent.change(visibility, {
    target: { value: String(AccessLevel.EXPERT) },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Expand group' }));
  fireEvent.click(row('expert'));
  fireEvent.click(screen.getByRole('button', { name: 'Collapse group' }));
  act(() => root.schema_update.fire());
  fireEvent.click(screen.getByRole('button', { name: 'Expand group' }));
  expect(row('expert')).toHaveAttribute('aria-selected', 'true');

  fireEvent.change(visibility, {
    target: { value: String(AccessLevel.OPERATOR) },
  });
  fireEvent.change(visibility, {
    target: { value: String(AccessLevel.EXPERT) },
  });
  expect(row('expert')).toHaveAttribute('aria-selected', 'false');
});

test('keeps visibility panel-local, waits for schema and clears on disconnect and offline', () => {
  const expert = new StringBinding({
    value: 'secret',
    attributes: new HashAttributes({ requiredAccessLevel: AccessLevel.EXPERT }),
  });
  add('expert', expert);
  render(<ConfigurationPanel />);
  show();
  expect(screen.queryByText('expert')).not.toBeInTheDocument();
  fireEvent.change(
    screen.getByRole('combobox', { name: 'Configuration visibility' }),
    { target: { value: String(AccessLevel.EXPERT) } }
  );
  expect(screen.getByText('secret')).toBeInTheDocument();
  act(() => root.setOnlineFlag(false));
  expect(
    screen.getByText('Select a device to view its configuration.')
  ).toBeInTheDocument();
  const waiting = new DeviceProxy('WAITING');
  waiting.isOnline = true;
  waiting.status = ProxyStatus.ONLINEREQUESTED;
  show(waiting);
  expect(screen.getByText('Waiting for device schema…')).toBeInTheDocument();
  expect(
    screen.getByRole('status', { name: 'Waiting for device schema' })
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('tree', { name: 'Device configuration' })
  ).not.toBeInTheDocument();
  waiting.binding.value!.set('expert', expert);
  act(() => waiting.schema_update.fire());
  expect(screen.getByText('secret')).toBeInTheDocument();
  expect(
    screen.queryByRole('status', { name: 'Waiting for device schema' })
  ).not.toBeInTheDocument();
  act(() =>
    broadcast_event(KaraboEvent.NetworkConnectStatus, new Hash('status', false))
  );
  expect(
    screen.getByText('Select a device to view its configuration.')
  ).toBeInTheDocument();
});

test('Strict Mode cleanup releases monitoring exactly once and detaches event listeners', () => {
  const { unmount } = render(
    <StrictMode>
      <ConfigurationPanel />
    </StrictMode>
  );
  show();
  expect(root.isMonitoring).toBe(true);
  unmount();
  expect(root.isMonitoring).toBe(false);
  expect(network.onStopMonitoringDevice).toHaveBeenCalledTimes(1);
  show();
  expect(root.isMonitoring).toBe(false);
});

test('rechecks current access before React has rendered the new disabled state', () => {
  add(
    'start',
    new SlotBinding({
      attributes: new HashAttributes({
        requiredAccessLevel: AccessLevel.OPERATOR,
      }),
    })
  );
  render(<ConfigurationPanel />);
  show();
  const button = screen.getByRole('button', { name: 'start' });
  act(() => {
    useGlobalStore.setState({
      sessionInfo: { accessLevel: AccessLevel.OBSERVER } as never,
    });
    fireEvent.click(button);
  });
  expect(network.onExecute).not.toHaveBeenCalled();
});

test('sizes column 0 to property contents and shares its width with the header and every row', () => {
  const contentWidth = jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: HTMLElement) {
      const width = this.textContent === 'Long property label' ? 180 : 50;
      return { width } as DOMRect;
    });
  add(
    'long',
    new StringBinding({
      attributes: new HashAttributes({ displayedName: 'Long property label' }),
    })
  );
  render(<ConfigurationPanel />);
  show();
  const configuration = screen.getByRole('region', { name: 'Configuration' });
  expect(screen.getByText('Long property label')).toHaveAttribute(
    'title',
    'Long property label'
  );
  expect(screen.getByText('Long property label').parentElement).toHaveClass(
    'w-full',
    'min-w-0'
  );
  expect(row('Long property label').closest('[data-configuration-tree]')).toBe(
    configuration.querySelector('[data-configuration-tree]')
  );
  const grid = screen
    .getByText('Property')
    .closest('[data-configuration-header]') as HTMLElement;
  expect(grid.style.gridTemplateColumns).toContain(
    'var(--configuration-property-width)'
  );
  expect(row('Long property label').firstElementChild).toHaveStyle({
    gridTemplateColumns: grid.style.gridTemplateColumns,
  });
  expect(configuration.querySelector('[data-configuration-tree]')).toHaveStyle({
    '--configuration-property-width': '229px',
  });
  fireEvent.keyDown(
    screen.getByRole('separator', { name: 'Resize Property column' }),
    { key: 'ArrowRight' }
  );
  expect(configuration.querySelector('[data-configuration-tree]')).toHaveStyle({
    '--configuration-property-width': '239px',
  });
  act(() => root.handleDeviceConfiguration(new Hash('state', 'ACTIVE')));
  expect(configuration.querySelector('[data-configuration-tree]')).toHaveStyle({
    '--configuration-property-width': '239px',
  });
  root.binding.value!.clear_namespace();
  add('short', new StringBinding());
  act(() => root.schema_update.fire());
  expect(configuration.querySelector('[data-configuration-tree]')).toHaveStyle({
    '--configuration-property-width': '99px',
  });
  contentWidth.mockRestore();
});

test('elides middle-column values, retains the full tooltip and caps column resizing at 320px', () => {
  const value = 'A device value that is much longer than the visible column';
  add('reading', new StringBinding({ value }));
  const opened = jest.fn();
  const remove = mediator.on(KaraboEvent.OpenControllerPanel, opened);
  add('table', new VectorHashBinding());
  render(<ConfigurationPanel />);
  show();
  expect(middle('reading')).toHaveAttribute('title', value);
  expect(middle('reading').firstElementChild).toHaveClass('truncate');
  const resize = screen.getByRole('separator', {
    name: 'Resize Current value on device column',
  });
  fireEvent.keyDown(resize, { key: 'End' });
  expect(
    screen.getByRole('tree').closest('[data-configuration-tree]')
  ).toHaveStyle({ '--configuration-value-width': '320px' });
  fireEvent.click(
    within(middle('table')).getByRole('button', { name: 'Table' })
  );
  fireEvent.doubleClick(middle('table'));
  expect(opened).not.toHaveBeenCalled();
  remove();
});

test('remeasures surviving property names on schema replacement', () => {
  jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: HTMLElement) {
      return {
        width: this.textContent === 'Updated display name' ? 240 : 50,
      } as DOMRect;
    });
  add('reading', new StringBinding());
  render(<ConfigurationPanel />);
  show();
  const binding = root.getBinding('reading')!;
  binding.displayedName = 'Updated display name';
  act(() => root.schema_update.fire());
  expect(
    row('Updated display name').closest('[data-configuration-tree]')
  ).toHaveStyle({ '--configuration-property-width': '289px' });
});

test('defers schema sizing received while hidden until the viewport becomes measurable', async () => {
  const observers = new Map<
    ResizeObserver,
    { callback: ResizeObserverCallback; element: Element }
  >();
  global.ResizeObserver = class {
    constructor(private callback: ResizeObserverCallback) {}
    observe(element: Element) {
      observers.set(this, { callback: this.callback, element });
    }
    unobserve() {}
    disconnect() {
      observers.delete(this);
    }
  };
  jest
    .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
    .mockImplementation(function (this: HTMLElement) {
      return this.closest('[hidden]') ? 0 : 600;
    });
  jest
    .spyOn(HTMLElement.prototype, 'clientHeight', 'get')
    .mockImplementation(function (this: HTMLElement) {
      return this.closest('[hidden]') ? 0 : 400;
    });
  jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: HTMLElement) {
      if (this.closest('[hidden]')) {
        return { width: 0 } as DOMRect;
      }
      return {
        width: this.textContent === 'Updated display name' ? 240 : 50,
      } as DOMRect;
    });
  const notifyResize = () => {
    act(() => {
      for (const [observer, { callback, element }] of Array.from(observers)) {
        callback(
          [
            {
              contentRect: {
                width: (element as HTMLElement).clientWidth,
                height: (element as HTMLElement).clientHeight,
              },
            } as ResizeObserverEntry,
          ],
          observer
        );
      }
    });
  };
  add('reading', new StringBinding());
  const view = render(
    <div>
      <ConfigurationPanel />
    </div>
  );
  show();
  await act(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  );
  view.rerender(
    <div hidden>
      <ConfigurationPanel />
    </div>
  );
  notifyResize();
  root.getBinding('reading')!.displayedName = 'Updated display name';
  act(() => root.schema_update.fire());
  await act(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  );
  view.rerender(
    <div>
      <ConfigurationPanel />
    </div>
  );
  notifyResize();
  expect(
    row('Updated display name').closest('[data-configuration-tree]')
  ).toHaveStyle({ '--configuration-property-width': '289px' });
});

test('allows native button activation with Space without toggling a focused group', () => {
  add('group', new NodeBinding());
  add('start', new SlotBinding());
  render(<ConfigurationPanel />);
  show();
  fireEvent.click(row('group'));
  const button = screen.getByRole('button', { name: 'start' });
  act(() => button.focus());
  const space = new KeyboardEvent('keydown', {
    key: ' ',
    code: 'Space',
    bubbles: true,
    cancelable: true,
  });
  fireEvent(button, space);
  expect(space.defaultPrevented).toBe(false);
  expect(row('group')).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(button);
  expect(network.onExecute).toHaveBeenCalledWith('DEV', 'start', false);
});

test('continues a column drag when the pointer moves beyond the header separator', () => {
  const originalPointerEvent = window.PointerEvent;
  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    value: MouseEvent,
  });
  try {
    jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 100 } as DOMRect);
    add('reading', new StringBinding());
    render(<ConfigurationPanel />);
    show();
    const separator = screen.getByRole('separator', {
      name: 'Resize Property column',
    });
    const width = Number(separator.getAttribute('aria-valuenow'));
    fireEvent.pointerDown(separator, { clientX: 100, button: 0 });
    fireEvent.pointerMove(window, { clientX: 180 });
    fireEvent.pointerUp(window);
    expect(separator).toHaveAttribute('aria-valuenow', String(width + 80));
    fireEvent.pointerMove(window, { clientX: 200 });
    expect(separator).toHaveAttribute('aria-valuenow', String(width + 80));
  } finally {
    Object.defineProperty(window, 'PointerEvent', {
      configurable: true,
      value: originalPointerEvent,
    });
  }
});

test('does not rerender an unaffected row when selection or column widths change', () => {
  add('reading', new Int32Binding({ value: 12 }));
  add('other', new StringBinding({ value: 'other value' }));
  const model = new ConfigurationTreeModel();
  model.setRoot(root);
  const data = model.getSnapshot();
  const reading = data.find((node) => node.id === 'reading')!;
  const readName = jest.fn(() => 'reading');
  Object.defineProperty(reading, 'name', { get: readName });
  try {
    render(<ConfigurationTree model={model} data={data} />);
    const readingRow = row('reading');
    readName.mockClear();
    fireEvent.click(row('other'));
    fireEvent.keyDown(
      screen.getByRole('separator', { name: 'Resize Property column' }),
      { key: 'ArrowRight' }
    );
    expect(readName).not.toHaveBeenCalled();
    expect(readingRow).toHaveAttribute('aria-selected', 'false');
    expect(row('other')).toHaveAttribute('aria-selected', 'true');
    expect(within(readingRow).getByTestId('current-value')).toHaveTextContent(
      '12'
    );
  } finally {
    cleanup();
    model.dispose();
  }
});

test('reuses formatted values across unrelated updates and refreshes on value and schema changes', () => {
  const reading = new Int32Binding({ value: 12 });
  reading.unit_label = 'mm';
  add('reading', reading);
  add('other', new StringBinding({ value: 'other value' }));
  const format = jest.spyOn(utils, 'formatCurrentValue');
  render(<ConfigurationPanel />);
  show();
  format.mockClear();
  act(() =>
    root.handleDeviceConfiguration(
      new Hash('other', 'updated', 'state', 'ERROR')
    )
  );
  expect(
    format.mock.calls.filter(([proxy]) => proxy.path === 'reading')
  ).toHaveLength(0);
  expect(middle('reading')).toHaveTextContent('12 mm');
  expect(middle('reading')).toHaveStyle({ backgroundColor: ERROR_COLOR_ALPHA });
  act(() => root.handleDeviceConfiguration(new Hash('reading', 13)));
  expect(middle('reading')).toHaveTextContent('13 mm');
  expect(
    format.mock.calls.filter(([proxy]) => proxy.path === 'reading')
  ).toHaveLength(1);
  const replacement = new Int32Binding({ value: 13 });
  replacement.unit_label = 'cm';
  add('reading', replacement);
  act(() => root.schema_update.fire());
  expect(middle('reading')).toHaveTextContent('13 cm');
});
