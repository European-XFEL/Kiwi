import { ImageGraphModel, buildModelConfig } from '@/karabo/common/api';
import { act, cleanup, fireEvent, render } from '@testing-library/react';

import { Encoding, Hash, HashType, Timestamp } from '@/karabo/data/api';
import {
  BaseBinding,
  BindingRoot,
  DeviceProxy,
  ImageBinding,
  NodeBinding,
  PropertyProxy,
  applyConfiguration,
} from '@/lib/binding/api';
import { createMockSystemTopology, SingletonContext } from '@/testing';
import { useProxies } from '../../../useProxies';
import { useImageGraphView } from '../useImageGraphView';

let resize: (width: number, height: number) => void;
let draw: jest.Mock;
let disconnect: jest.Mock;
let text: jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  draw = jest.fn();
  disconnect = jest.fn();
  text = jest.fn();
  const context = new Proxy(
    {
      canvas: document.createElement('canvas'),
      putImageData: draw,
      fillText: text,
      createImageData: (width: number, height: number) => ({
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4),
      }),
      measureText: () => ({ width: 20 }),
      createLinearGradient: () => ({ addColorStop() {} }),
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    },
    {
      get: (target, key) =>
        key in target ? Reflect.get(target, key) : () => {},
    }
  );
  jest
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(context as unknown as CanvasRenderingContext2D);
  jest.spyOn(window, 'ResizeObserver').mockImplementation((callback) => {
    const observer = { observe() {}, unobserve() {}, disconnect };
    resize = (width, height) =>
      act(() =>
        callback(
          [{ contentRect: { width, height } } as ResizeObserverEntry],
          observer
        )
      );
    return observer;
  });
});
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

function fixture(width = 100, height = 100) {
  const binding = new ImageBinding();
  const pixels = new NodeBinding();
  pixels.value.set(
    'data',
    new BaseBinding({ value: new Uint8Array(width * height) })
  );
  pixels.value.set('type', new BaseBinding({ value: HashType.UInt8 }));
  binding.value.set('pixels', pixels);
  binding.value.set('dims', new BaseBinding({ value: [height, width] }));
  const encoding = new BaseBinding();
  encoding.setValue(Encoding.GRAY, undefined);
  binding.value.set('encoding', encoding);
  const root = new DeviceProxy('IMAGE');
  root.binding = new BindingRoot();
  root.binding.value!.set('image', binding);
  root.setOnlineFlag(true);
  const proxy = new PropertyProxy(root, 'image');
  return { proxy, binding };
}

let view: ReturnType<typeof useImageGraphView>;
function Harness({
  model,
  proxy,
}: {
  model: ImageGraphModel;
  proxy?: PropertyProxy;
}) {
  view = useImageGraphView({ proxy, plotConfig: buildModelConfig(model) });
  return (
    <div ref={view.containerRef} data-testid="view">
      <div ref={view.stageRef} />
      <div ref={view.selectionRef} />
    </div>
  );
}
const flush = () => act(() => jest.advanceTimersByTime(32));
function mount(model = new ImageGraphModel(), proxy = fixture().proxy) {
  model.aspect_ratio = 0;
  const result = render(<Harness model={model} proxy={proxy} />);
  resize(800, 600);
  flush();
  return { ...result, model, proxy, element: result.getByTestId('view') };
}
function ranges() {
  return view.viewport.readRanges()!;
}
test.each(['Escape', 'blur'])(
  'cancels a live pan with %s while incoming frames keep drawing',
  (cancel) => {
    const { proxy, binding } = fixture();
    const { element, rerender, model } = mount(undefined, proxy);
    act(() => view.selectTool('pan'));
    const initial = ranges();
    fireEvent.mouseDown(element, { button: 0, clientX: 200, clientY: 200 });
    fireEvent.mouseMove(document, { clientX: 240, clientY: 230 });
    flush();
    expect(ranges()).not.toEqual(initial);
    binding.bindingUpdated(new Timestamp(1));
    rerender(<Harness model={model} proxy={proxy} />);
    flush();
    expect(ranges()).not.toEqual(initial);
    if (cancel === 'Escape') {
      fireEvent.keyDown(document, { key: 'Escape' });
    } else {
      fireEvent.blur(window);
    }
    flush();
    expect(ranges()).toEqual(initial);
  }
);

test('coalesces updates, skips unchanged frames, resets on source replacement, and cleans up', () => {
  const { proxy, binding } = fixture();
  const { rerender, model, unmount, element } = mount(undefined, proxy);
  draw.mockClear();
  rerender(<Harness model={model} proxy={proxy} />);
  flush();
  expect(draw).not.toHaveBeenCalled();
  act(() => {
    binding.bindingUpdated(new Timestamp(1));
  });
  rerender(<Harness model={model} proxy={proxy} />);
  act(() => {
    binding.bindingUpdated(new Timestamp(2));
  });
  rerender(<Harness model={model} proxy={proxy} />);
  flush();
  expect(draw).toHaveBeenCalledTimes(1);
  fireEvent.wheel(element, { clientX: 300, clientY: 300, deltaY: -100 });
  flush();
  expect(ranges().x[0]).toBeGreaterThan(0);
  rerender(<Harness model={model} proxy={fixture(200, 50).proxy} />);
  flush();
  expect(ranges()).toEqual({ x: [0, 200], y: [0, 50] });
  unmount();
  expect(disconnect).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});

test('unmounting an active gesture leaves no queued rendering work', () => {
  const { element, unmount } = mount();
  act(() => view.selectTool('pan'));
  fireEvent.mouseDown(element, { button: 0, clientX: 200, clientY: 200 });
  fireEvent.mouseMove(document, { clientX: 240, clientY: 230 });
  unmount();
  expect(jest.getTimerCount()).toBe(0);
});

test('shows empty, unsupported, and offline placeholders and skips zero-size drawing', () => {
  const { rerender, model, proxy } = mount();
  proxy.root.setOnlineFlag(false);
  rerender(<Harness model={model} proxy={proxy} />);
  flush();
  expect(text.mock.calls.some(([value]) => value === 'Image')).toBe(true);
  proxy.root.setOnlineFlag(true);
  applyConfiguration(
    new Hash('image.encoding', Encoding.JPEG),
    proxy.root.binding,
    new Timestamp(1)
  );
  rerender(<Harness model={model} proxy={proxy} />);
  flush();
  expect(
    text.mock.calls.some(([value]) => value === 'Unsupported Encoding')
  ).toBe(true);
  resize(0, 0);
  text.mockClear();
  flush();
  expect(text).not.toHaveBeenCalled();
});

test('controller subscriptions publish applyConfiguration updates during a drag and reset changed dimensions', async () => {
  const topology = createMockSystemTopology();
  const device = topology.getDevice('IMAGE');
  const { proxy, binding } = fixture();
  device.binding = proxy.root.binding;
  device.setOnlineFlag(true);
  const model = new ImageGraphModel();
  model.aspect_ratio = 0;
  const keys = ['IMAGE.image'];
  function ConnectedImage() {
    const proxies = useProxies(keys);
    return <Harness model={model} proxy={proxies[0]} />;
  }
  await SingletonContext.run({ topology }, () => {
    const { getByTestId, unmount } = render(<ConnectedImage />);
    resize(800, 600);
    flush();
    const element = getByTestId('view');
    act(() => view.selectTool('pan'));
    fireEvent.mouseDown(element, { button: 0, clientX: 200, clientY: 200 });
    fireEvent.mouseMove(document, { clientX: 240, clientY: 230 });
    flush();
    const moved = ranges();
    const namespace = binding.value;
    draw.mockClear();
    act(() =>
      applyConfiguration(
        new Hash('image.pixels.data', new Uint8Array(10000).fill(100)),
        device.binding,
        new Timestamp(1)
      )
    );
    flush();
    expect(binding.value).toBe(namespace);
    expect(draw).toHaveBeenCalledTimes(1);
    expect(ranges()).toEqual(moved);
    fireEvent.mouseUp(document, { button: 0, clientX: 280, clientY: 230 });
    flush();
    expect(ranges().x[0]).toBeLessThan(moved.x[0]);
    fireEvent.mouseDown(element, { button: 0, clientX: 200, clientY: 200 });
    fireEvent.mouseMove(document, { clientX: 240, clientY: 230 });
    flush();
    act(() =>
      applyConfiguration(
        new Hash('image.dims', [50, 200]),
        device.binding,
        new Timestamp(2)
      )
    );
    flush();
    expect(ranges()).toEqual({ x: [0, 200], y: [0, 50] });
    fireEvent.mouseUp(document, { button: 0, clientX: 280, clientY: 230 });
    flush();
    expect(ranges()).toEqual({ x: [0, 200], y: [0, 50] });
    unmount();
    proxy.dispose();
  });
});

test('resets and publishes a replacement binding with an unchanged timestamp', () => {
  const { proxy, binding } = fixture();
  const { rerender, model, element } = mount(undefined, proxy);
  fireEvent.wheel(element, { clientX: 300, clientY: 300, deltaY: -100 });
  flush();
  expect(ranges().x[0]).toBeGreaterThan(0);
  const replacement = fixture().binding;
  replacement.timestamp = binding.timestamp;
  act(() => {
    proxy.root.binding.value!.set('image', replacement);
    proxy.root.schema_update.fire();
  });
  draw.mockClear();
  rerender(<Harness model={model} proxy={proxy} />);
  flush();
  expect(ranges()).toEqual({ x: [0, 100], y: [0, 100] });
  expect(draw).toHaveBeenCalledTimes(1);
});

test('renders axes from plain settings and publishes settings changes without idle redraws', () => {
  const { rerender, model, proxy } = mount();
  expect(text).toHaveBeenCalledWith('X-axis (pixels)', 392, 12, 640);
  draw.mockClear();
  rerender(<Harness model={model} proxy={proxy} />);
  flush();
  expect(draw).not.toHaveBeenCalled();
  model.x_label = 'Distance';
  model.x_units = 'mm';
  model.x_scale = 2;
  text.mockClear();
  rerender(<Harness model={model} proxy={proxy} />);
  flush();
  expect(text).toHaveBeenCalledWith('Distance (mm)', 392, 12, 640);
  expect(draw).toHaveBeenCalledTimes(1);
});
