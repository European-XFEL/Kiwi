import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import Konva from 'konva';
import { DetectorGraphModel, WebCamGraphModel } from '@/karabo/common/api';
import { AccessLevel, Encoding, HashType, Timestamp } from '@/karabo/data/api';
import {
  BaseBinding,
  BindingRoot,
  DeviceProxy,
  ImageBinding,
  NodeBinding,
  PropertyProxy,
} from '@/lib/binding/api';
import { createMockSystemTopology, SingletonContext } from '@/testing';
import { useController } from '../../useController';
import { useProxies } from '../../useProxies';
import DisplayWebcamGraph from '../DisplayWebcamGraph';

let resize: (width: number, height: number) => void;
const disconnect = jest.fn();
const fillRect = jest.fn();
const fillText = jest.fn();
const fillColors: string[] = [];
let context: CanvasRenderingContext2D;

beforeEach(() => {
  jest.useFakeTimers();
  resize = () => {};
  disconnect.mockClear();
  fillRect.mockClear();
  fillText.mockClear();
  fillColors.length = 0;
  jest.spyOn(window, 'ResizeObserver').mockImplementation((callback) => {
    const observer = { observe() {}, unobserve() {}, disconnect };
    resize = (width, height) => {
      act(() => {
        callback(
          [{ contentRect: { width, height } } as ResizeObserverEntry],
          observer
        );
      });
    };
    return observer;
  });
  context = {
    canvas: document.createElement('canvas'),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    fillStyle: '',
    fillRect: (...args: Parameters<CanvasRenderingContext2D['fillRect']>) => {
      fillColors.push(context.fillStyle as string);
      fillRect(...args);
    },
    strokeRect() {},
    fillText,
    createImageData: (width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }),
    putImageData() {},
  } as unknown as CanvasRenderingContext2D;
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    new Proxy(context, {
      get: (target, key) =>
        key in target ? Reflect.get(target, key) : () => {},
    })
  );
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

function frameContext(width: number, height: number, encoding = Encoding.GRAY) {
  const binding = new ImageBinding();
  const pixels = new NodeBinding();
  pixels.value.set(
    'data',
    new BaseBinding({ value: new Uint8Array(width * height) })
  );
  pixels.value.set('type', new BaseBinding({ value: HashType.UInt8 }));
  binding.value.set('pixels', pixels);
  binding.value.set('dims', new BaseBinding({ value: [height, width] }));
  const encodingBinding = new BaseBinding();
  encodingBinding.setValue(encoding, undefined);
  binding.value.set('encoding', encodingBinding);
  const root = new DeviceProxy('CAMERA');
  root.setOnlineFlag(true);
  root.binding = new BindingRoot();
  root.binding.value!.set('image', binding);
  const proxy = new PropertyProxy(root, 'image');
  return {
    binding,
    proxy,
    proxies: [proxy],
    userAccessLevel: AccessLevel.OBSERVER,
  };
}

function drawFrame() {
  act(() => jest.advanceTimersByTime(16));
}

function overlay() {
  return screen.getByLabelText('Waiting for image').parentElement!
    .parentElement!;
}

test.each([WebCamGraphModel, DetectorGraphModel])(
  '%p shows the placeholder when its device goes offline with a cached frame',
  async (Model) => {
    const topology = createMockSystemTopology();
    const device = topology.getDevice('CAMERA');
    const fixture = frameContext(2, 2);
    const binding = fixture.binding;
    binding.bindingUpdated(new Timestamp(new Date()));
    device.binding = fixture.proxy.root.binding;
    device.setOnlineFlag(true);
    const draw = jest.spyOn(context, 'putImageData');
    const model = new Model();
    model.keys = ['CAMERA.image'];
    function ConnectedImage() {
      const ctx = useController(useProxies(model.keys));
      return <DisplayWebcamGraph model={model} ctx={ctx} />;
    }

    await SingletonContext.run({ topology }, () => {
      const { unmount } = render(<ConnectedImage />);
      try {
        resize(400, 300);
        drawFrame();
        expect(draw).toHaveBeenCalled();
        expect(screen.getByLabelText('Image timestamp')).toBeVisible();
        draw.mockClear();

        act(() => device.setOnlineFlag(false));
        drawFrame();
        expect(device.getBinding('image')).toBe(binding);
        expect(fillText).toHaveBeenLastCalledWith('Image', 200, 150, 360);
        expect(draw).not.toHaveBeenCalled();
        expect(screen.getByLabelText('Waiting for image')).toBeVisible();
        expect(screen.queryByLabelText('Image timestamp')).toBeNull();

        resize(600, 300);
        drawFrame();
        expect(fillText).toHaveBeenLastCalledWith('Image', 300, 150, 560);
        expect(draw).not.toHaveBeenCalled();
      } finally {
        unmount();
        fixture.proxy.dispose();
      }
    });
  }
);

test.each([
  [600, 600],
  [600, 300],
  [400, 300],
])('fits the placeholder overlay inside a %s by %s view', (width, height) => {
  render(<DisplayWebcamGraph model={new WebCamGraphModel()} />);
  drawFrame();
  resize(width, height);
  drawFrame();
  expect(overlay()).toHaveStyle({
    left: '0px',
    top: '0px',
    width: `${width}px`,
    height: `${height}px`,
  });
  expect(
    screen.getByLabelText('Webcam image').querySelector('canvas')
  ).toHaveProperty('width', width);
  expect(
    screen.getByLabelText('Webcam image').querySelector('canvas')
  ).toHaveProperty('height', height);
  expect(fillRect).toHaveBeenLastCalledWith(0, 0, width, height);
  expect(fillColors.at(-1)).toBe('#000');
  expect(context.fillStyle).toBe('#fff');
});

test('updates overlay bounds when the widget resizes', () => {
  render(<DisplayWebcamGraph model={new WebCamGraphModel()} />);
  drawFrame();
  resize(600, 600);
  resize(600, 300);
  drawFrame();
  expect(overlay()).toHaveStyle({
    left: '0px',
    top: '0px',
    width: '600px',
    height: '300px',
  });
  expect(fillRect).toHaveBeenLastCalledWith(0, 0, 600, 300);
});

test('follows frame dimension changes with the same pixel count', () => {
  const model = new WebCamGraphModel();
  const { rerender } = render(
    <DisplayWebcamGraph model={model} ctx={frameContext(4, 3)} />
  );
  drawFrame();
  resize(600, 600);
  drawFrame();
  expect(overlay()).toHaveStyle({
    left: '0px',
    top: '75px',
    width: '600px',
    height: '450px',
  });
  rerender(<DisplayWebcamGraph model={model} ctx={frameContext(3, 4)} />);
  drawFrame();
  expect(overlay()).toHaveStyle({
    left: '75px',
    top: '0px',
    width: '450px',
    height: '600px',
  });
});

test('uses placeholder bounds after an unsupported frame', () => {
  const model = new WebCamGraphModel();
  const { rerender } = render(
    <DisplayWebcamGraph model={model} ctx={frameContext(3, 4)} />
  );
  drawFrame();
  resize(600, 600);
  rerender(
    <DisplayWebcamGraph model={model} ctx={frameContext(4, 1, Encoding.JPEG)} />
  );
  drawFrame();
  expect(overlay()).toHaveStyle({
    left: '0px',
    top: '0px',
    width: '600px',
    height: '600px',
  });
  expect(fillRect).toHaveBeenLastCalledWith(0, 0, 600, 600);
  expect(fillColors.at(-1)).toBe('#000');
  expect(fillText).toHaveBeenLastCalledWith(
    'Unsupported Encoding',
    300,
    300,
    560
  );
  expect(context.fillStyle).toBe('#fff');
});

test('hides the overlay in a zero-size view and disconnects on unmount', () => {
  const { unmount } = render(
    <DisplayWebcamGraph model={new WebCamGraphModel()} />
  );
  drawFrame();
  resize(0, 0);
  drawFrame();
  expect(screen.getByLabelText('Waiting for image')).not.toBeVisible();
  resize(400, 300);
  drawFrame();
  expect(screen.getByLabelText('Waiting for image')).toBeVisible();
  unmount();
  expect(disconnect).toHaveBeenCalledTimes(1);
});

test('uses a bounded Konva raster without axes, toolbar, or navigation', () => {
  const draw = jest.spyOn(context, 'putImageData');
  render(
    <DisplayWebcamGraph
      model={new WebCamGraphModel()}
      ctx={frameContext(4096, 4096)}
    />
  );
  resize(800, 600);
  drawFrame();
  expect(screen.queryByRole('toolbar')).toBeNull();
  expect(
    screen.getByLabelText('Webcam image').querySelector('.konvajs-content')
  ).not.toBeNull();
  const frame = draw.mock.calls.at(-1)![0];
  expect(frame.width).toBeLessThanOrEqual(601);
  expect(frame.height).toBeLessThanOrEqual(601);
  expect(fillText).not.toHaveBeenCalled();
  expect(overlay()).toHaveStyle({
    left: '100px',
    top: '0px',
    width: '600px',
    height: '600px',
  });
  draw.mockClear();
  fireEvent.wheel(screen.getByLabelText('Webcam image'), {
    clientX: 300,
    clientY: 300,
    deltaY: -100,
  });
  drawFrame();
  expect(draw).not.toHaveBeenCalled();
  resize(600, 800);
  drawFrame();
  const image = Konva.stages.at(-1)!.findOne<Konva.Image>('Image')!;
  expect(image.width()).toBeCloseTo(600);
  expect(image.height()).toBeCloseTo(600);
  expect(image.position()).toEqual({ x: 0, y: 100 });
  expect(overlay()).toHaveStyle({
    left: '0px',
    top: '100px',
    width: '600px',
    height: '600px',
  });
});
