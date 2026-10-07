import { act, cleanup, render, screen } from '@testing-library/react';
import { WebCamGraphModel } from '@/karabo/common/api';
import { AccessLevel, Encoding, HashType } from '@/karabo/data/api';
import {
  BaseBinding,
  BindingRoot,
  DeviceProxy,
  ImageBinding,
  NodeBinding,
  PropertyProxy,
} from '@/lib/binding/api';
import DisplayWebcamGraph from '../DisplayWebcamGraph';

let resize: (width: number, height: number) => void;
const disconnect = jest.fn();

beforeEach(() => {
  jest.useFakeTimers();
  resize = () => {};
  disconnect.mockClear();
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
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    fillRect() {},
    strokeRect() {},
    fillText() {},
    createImageData: (width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }),
    putImageData() {},
  } as unknown as CanvasRenderingContext2D);
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
  root.binding = new BindingRoot();
  root.binding.value!.set('image', binding);
  const proxy = new PropertyProxy(root, 'image');
  return { proxy, proxies: [proxy], userAccessLevel: AccessLevel.OBSERVER };
}

function drawFrame() {
  act(() => jest.advanceTimersByTime(16));
}

function overlay() {
  return screen.getByLabelText('Waiting for image').parentElement!
    .parentElement!;
}

test.each([
  [600, 600, { left: '0px', top: '75px', width: '600px', height: '450px' }],
  [600, 300, { left: '100px', top: '0px', width: '400px', height: '300px' }],
  [400, 300, { left: '0px', top: '0px', width: '400px', height: '300px' }],
])(
  'fits the placeholder overlay inside a %s by %s view',
  (width, height, bounds) => {
    render(<DisplayWebcamGraph model={new WebCamGraphModel()} />);
    drawFrame();
    resize(width, height);
    expect(overlay()).toHaveStyle(bounds);
  }
);

test('updates overlay bounds when the widget resizes', () => {
  render(<DisplayWebcamGraph model={new WebCamGraphModel()} />);
  drawFrame();
  resize(600, 600);
  resize(600, 300);
  expect(overlay()).toHaveStyle({
    left: '100px',
    top: '0px',
    width: '400px',
    height: '300px',
  });
});

test('follows frame dimension changes with the same pixel count', () => {
  const model = new WebCamGraphModel();
  const { rerender } = render(
    <DisplayWebcamGraph model={model} ctx={frameContext(4, 3)} />
  );
  drawFrame();
  resize(600, 600);
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
    top: '75px',
    width: '600px',
    height: '450px',
  });
});

test('hides the overlay in a zero-size view and disconnects on unmount', () => {
  const { unmount } = render(
    <DisplayWebcamGraph model={new WebCamGraphModel()} />
  );
  drawFrame();
  resize(0, 0);
  expect(screen.getByLabelText('Waiting for image')).not.toBeVisible();
  resize(400, 300);
  expect(screen.getByLabelText('Waiting for image')).toBeVisible();
  unmount();
  expect(disconnect).toHaveBeenCalledTimes(1);
});
