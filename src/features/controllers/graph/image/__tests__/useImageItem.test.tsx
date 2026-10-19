import { ImageGraphModel, buildModelConfig } from '@/karabo/common/api';
import { StrictMode } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import Konva from 'konva';

import { Encoding } from '@/karabo/data/api';
import * as raster from '../raster';
import * as decorations from '../decorations';
import type { ImageView } from '../useImageViewBox';
import { useImageItem } from '../useImageItem';

let upload: jest.Mock;
let allocate: jest.Mock;
let text: jest.Mock;
let geometry: ImageView;
let item: ReturnType<typeof useImageItem>;
const readView = () => geometry;

beforeEach(() => {
  jest.useFakeTimers();
  upload = jest.fn();
  text = jest.fn();
  allocate = jest.fn((width: number, height: number) => ({
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  }));
  const context = new Proxy(
    {
      canvas: document.createElement('canvas'),
      putImageData: upload,
      fillText: text,
      createImageData: allocate,
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
  geometry = {
    size: { width: 80, height: 60 },
    bounds: { left: 0, right: 80, top: 0, bottom: 60 },
    ranges: { x: [0, 100], y: [0, 100] },
  };
});
afterEach(() => {
  cleanup();
  // Drain Konva's per-window queue before Jest discards its scheduled frame.
  act(() => jest.runOnlyPendingTimers());
  jest.restoreAllMocks();
  jest.useRealTimers();
});

function Harness() {
  item = useImageItem();
  return (
    <div ref={item.containerRef}>
      <div ref={item.stageRef} />
      <div ref={item.overlayRef} />
    </div>
  );
}
function frame() {
  const model = new ImageGraphModel();
  model.colormap = 'none';
  return {
    source: {
      data: Uint16Array.from({ length: 10000 }, (_, i) => i),
      width: 100,
      height: 100,
      channels: 1,
      encoding: Encoding.GRAY,
      color: false,
    } as raster.ImageSource | undefined,
    plotConfig: buildModelConfig(model),
    placeholder: undefined as string | undefined,
    imageOnly: false,
    readView,
  };
}
const flush = () => act(() => jest.advanceTimersByTime(32));
function mount() {
  const result = render(<Harness />);
  const input = frame();
  act(() => item.publish(input));
  flush();
  return { ...result, input };
}

test('coalesces publication and navigation, drawing the newest source with the latest view', () => {
  const { input, rerender } = mount();
  const publish = item.publish;
  const requestDraw = item.requestDraw;
  rerender(<Harness />);
  expect(item.publish).toBe(publish);
  expect(item.requestDraw).toBe(requestDraw);
  upload.mockClear();
  const convert = jest.spyOn(raster, 'rasterize');
  const obsolete = frame();
  const latest = frame();
  act(() => {
    item.publish(obsolete);
    item.requestDraw();
    item.publish(latest);
    geometry.ranges = { x: [25, 75], y: [25, 75] };
    item.requestDraw();
  });
  expect(convert).not.toHaveBeenCalled();
  flush();
  expect(upload).toHaveBeenCalledTimes(1);
  expect(convert).toHaveBeenCalledTimes(1);
  expect(convert.mock.calls[0][0]).toMatchObject({
    source: latest.source,
    ranges: geometry.ranges,
  });
  expect(convert.mock.calls[0][0].source).not.toBe(input.source);
  expect(jest.getTimerCount()).toBe(0);
});

test('reuses the ImageData and raster buffer across steady frames without queuing another Konva draw', () => {
  const { input } = mount();
  const first = upload.mock.calls[0][0] as ImageData;
  const convert = jest.spyOn(raster, 'rasterize');
  const layerDraw = jest.spyOn(Konva.Layer.prototype, 'draw');
  const queuedDraw = jest.spyOn(Konva.Layer.prototype, 'batchDraw');
  act(() => item.publish({ ...input, source: { ...input.source! } }));
  flush();
  expect(allocate).toHaveBeenCalledTimes(1);
  expect(upload.mock.calls[1][0]).toBe(first);
  expect(convert.mock.calls[0][0].buffer).toBe(first.data);
  expect(convert.mock.results[0].value.pixels).toBe(first.data);
  expect(layerDraw).toHaveBeenCalledTimes(1);
  expect(queuedDraw).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

test('draws navigation once without leaving an attribute-triggered Konva draw queued', () => {
  mount();
  const layer = Konva.stages.at(-1)!.getLayers()[0];
  const draw = jest.spyOn(layer, 'draw');
  geometry.ranges = { x: [20, 80], y: [20, 80] };
  geometry.bounds = { left: 4, right: 76, top: 3, bottom: 57 };
  act(() => item.requestDraw());
  flush();
  act(() => jest.advanceTimersByTime(64));
  expect(draw).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});

test('preserves Konva batchDraw for explicit redraw requests', () => {
  mount();
  const layer = Konva.stages.at(-1)!.getLayers()[0];
  const draw = jest.spyOn(layer, 'draw');
  layer.batchDraw();
  flush();
  expect(draw).toHaveBeenCalledTimes(1);
});

test('owns and reuses independent RGBA output buffers per widget', () => {
  const first = mount();
  const firstItem = item;
  const firstPixels = (upload.mock.calls.at(-1)![0] as ImageData).data;
  mount();
  const secondPixels = (upload.mock.calls.at(-1)![0] as ImageData).data;
  expect(secondPixels).not.toBe(firstPixels);
  act(() =>
    firstItem.publish({ ...first.input, source: { ...first.input.source! } })
  );
  flush();
  expect((upload.mock.calls.at(-1)![0] as ImageData).data).toBe(firstPixels);
});

test('caches automatic limits during navigation and resamples the next source', () => {
  const sample = jest.spyOn(raster, 'sampleLimits');
  const convert = jest.spyOn(raster, 'rasterize');
  const { input } = mount();
  expect(sample).toHaveBeenCalledTimes(1);
  geometry.ranges = { x: [25, 75], y: [25, 75] };
  act(() => item.requestDraw());
  flush();
  expect(sample).toHaveBeenCalledTimes(1);
  expect(convert.mock.calls.at(-1)![0].limits).toEqual([0, 9999]);
  act(() =>
    item.publish({
      ...input,
      source: { ...input.source!, data: new Uint16Array(10000).fill(50) },
    })
  );
  flush();
  expect(sample).toHaveBeenCalledTimes(2);
  expect(convert.mock.calls.at(-1)![0].limits).toEqual([50, 50]);
});

test('uses fixed levels and redraws changed settings explicitly without reallocating', () => {
  const { input } = mount();
  const convert = jest.spyOn(raster, 'rasterize');
  input.plotConfig.color_levels = [100, 500];
  act(() => item.publish(input));
  flush();
  expect(convert.mock.calls.at(-1)![0].limits).toEqual([100, 500]);
  input.plotConfig.color_levels = [NaN, 1];
  act(() => item.publish(input));
  flush();
  expect(convert.mock.calls.at(-1)![0].limits).toEqual([0, 9999]);
  expect(allocate).toHaveBeenCalledTimes(1);
});

test('draws placeholders without uploading pixels and skips zero-size views', () => {
  const { input } = mount();
  upload.mockClear();
  act(() =>
    item.publish({
      ...input,
      source: undefined,
      placeholder: 'Unsupported Encoding',
    })
  );
  flush();
  expect(
    text.mock.calls.some(([value]) => value === 'Unsupported Encoding')
  ).toBe(true);
  expect(upload).not.toHaveBeenCalled();
  text.mockClear();
  geometry.size = { width: 0, height: 0 };
  geometry.bounds = { left: 0, right: 0, top: 0, bottom: 0 };
  act(() => item.requestDraw());
  flush();
  expect(text).not.toHaveBeenCalled();
  expect(item.overlayRef.current!.style.display).toBe('none');
});

test('reads resized dimensions on redraw, resizes the stage and reallocates only the changed raster', () => {
  mount();
  const size = jest.spyOn(Konva.Stage.prototype, 'size');
  geometry.size = { width: 40, height: 30 };
  geometry.bounds = { left: 0, right: 40, top: 0, bottom: 30 };
  act(() => item.requestDraw());
  flush();
  expect(size).toHaveBeenCalledWith({ width: 40, height: 30 });
  expect(allocate).toHaveBeenCalledTimes(2);
  expect(allocate).toHaveBeenLastCalledWith(40, 30);
});

test('destroys drawing resources, cancels pending work and ignores invalidation after disposal', () => {
  const { unmount, input } = mount();
  const requestDraw = item.requestDraw;
  const publish = item.publish;
  const destroy = jest.spyOn(Konva.Stage.prototype, 'destroy');
  const schedule = jest.spyOn(window, 'requestAnimationFrame');
  act(() => requestDraw());
  unmount();
  expect(destroy).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
  schedule.mockClear();
  requestDraw();
  publish(input);
  expect(schedule).not.toHaveBeenCalled();
});

test('recreates drawing resources under StrictMode', () => {
  const { unmount } = render(
    <StrictMode>
      <Harness />
    </StrictMode>
  );
  act(() => item.publish(frame()));
  flush();
  expect(upload).toHaveBeenCalledTimes(1);
  unmount();
  expect(jest.getTimerCount()).toBe(0);
});

test('skips sampling fixed levels and samples the latest source when returning to automatic', () => {
  const sample = jest.spyOn(raster, 'sampleLimits');
  const convert = jest.spyOn(raster, 'rasterize');
  render(<Harness />);
  const input = frame();
  input.plotConfig.color_levels = [0, 100];
  act(() => item.publish(input));
  flush();
  const latest = { ...input.source!, data: new Uint16Array(10000).fill(42) };
  act(() => item.publish({ ...input, source: latest }));
  flush();
  expect(sample).not.toHaveBeenCalled();
  input.plotConfig.color_levels = [];
  act(() => item.publish({ ...input, source: latest }));
  flush();
  expect(sample).toHaveBeenCalledTimes(1);
  expect(sample).toHaveBeenCalledWith(latest);
  expect(convert.mock.calls.at(-1)![0].limits).toEqual([42, 42]);
});

test('keeps image axes for identical visible inputs while redrawing pixels and colorbar', () => {
  const { input } = mount();
  const axes = jest.spyOn(decorations, 'drawImageDecorations');
  text.mockClear();
  act(() =>
    item.publish({
      ...input,
      source: { ...input.source! },
      plotConfig: { ...input.plotConfig },
    })
  );
  flush();
  expect(upload).toHaveBeenCalledTimes(2);
  expect(axes).not.toHaveBeenCalled();
  expect(text).toHaveBeenCalledTimes(6);
});

test('redraws colorbar ticks without redrawing image axes when contrast or palette changes', () => {
  const { input } = mount();
  input.plotConfig.x_label = 'Distance';
  act(() => item.publish(input));
  flush();
  const axes = jest.spyOn(decorations, 'drawImageDecorations');
  text.mockClear();
  input.plotConfig.color_levels = [10, 50];
  input.plotConfig.colormap = 'viridis';
  act(() => item.publish(input));
  flush();
  expect(text.mock.calls.some(([label]) => label === '50')).toBe(true);
  expect(axes).not.toHaveBeenCalled();
  text.mockClear();
  act(() => item.requestDraw());
  flush();
  expect(text.mock.calls.some(([label]) => label === '50')).toBe(true);
  expect(axes).not.toHaveBeenCalled();
});

test.each([
  [
    'ranges',
    () => {
      geometry.ranges.x[0] = 5;
    },
  ],
  [
    'bounds',
    () => {
      geometry.bounds.left = 5;
    },
  ],
  [
    'size',
    () => {
      geometry.size.width = 90;
    },
  ],
  [
    'label',
    (input: ReturnType<typeof frame>) => {
      input.plotConfig.x_label = 'new label';
    },
  ],
  [
    'units',
    (input: ReturnType<typeof frame>) => {
      input.plotConfig.y_units = 'mm';
    },
  ],
  [
    'calibration',
    (input: ReturnType<typeof frame>) => {
      input.plotConfig.x_scale = 2;
    },
  ],
  [
    'translation',
    (input: ReturnType<typeof frame>) => {
      input.plotConfig.y_translate = 5;
    },
  ],
  [
    'scale',
    (input: ReturnType<typeof frame>) => {
      input.plotConfig.show_scale = !input.plotConfig.show_scale;
    },
  ],
  [
    'placeholder',
    (input: ReturnType<typeof frame>) => {
      input.source = undefined;
      input.placeholder = 'Image';
    },
  ],
])('invalidates image axes when %s changes in place', (_, change) => {
  const { input } = mount();
  const axes = jest.spyOn(decorations, 'drawImageDecorations');
  change(input);
  act(() => item.publish(input));
  flush();
  expect(axes).toHaveBeenCalled();
  axes.mockClear();
  act(() => item.requestDraw());
  flush();
  expect(axes).not.toHaveBeenCalled();
});

test('clears decorations when switching to image-only display', () => {
  const { input } = mount();
  const draw = jest.spyOn(Konva.Layer.prototype, 'draw');
  act(() => item.publish({ ...input, imageOnly: true }));
  flush();
  expect(draw).toHaveBeenCalledTimes(2);
  draw.mockClear();
  act(() => item.requestDraw());
  flush();
  expect(draw).toHaveBeenCalledTimes(1);
});

test('keeps contrast and decoration caches independent between widgets', () => {
  const first = mount();
  const firstItem = item;
  const second = mount();
  const secondItem = item;
  text.mockClear();
  const sample = jest.spyOn(raster, 'sampleLimits');
  const axes = jest.spyOn(decorations, 'drawImageDecorations');
  first.input.plotConfig.color_levels = [10, 20];
  first.input.plotConfig.x_label = 'First widget';
  act(() => firstItem.publish(first.input));
  flush();
  expect(text).toHaveBeenCalled();
  text.mockClear();
  axes.mockClear();
  act(() => secondItem.publish(second.input));
  flush();
  expect(axes).not.toHaveBeenCalled();
  expect(text.mock.calls.some(([label]) => label === '9999')).toBe(true);
  expect(sample).not.toHaveBeenCalled();
});

test.each([[NaN, 1], [0, Infinity], [2, 1], [1]])(
  'samples automatically for invalid fixed levels %j',
  (...levels) => {
    const { input } = mount();
    const latest = { ...input.source!, data: new Uint16Array(10000).fill(23) };
    const sample = jest.spyOn(raster, 'sampleLimits');
    const convert = jest.spyOn(raster, 'rasterize');
    input.plotConfig.color_levels = levels;
    act(() => item.publish({ ...input, source: latest }));
    flush();
    expect(sample).toHaveBeenCalledWith(latest);
    expect(convert.mock.calls.at(-1)![0].limits).toEqual([23, 23]);
  }
);

test('updates only the colorbar when automatic limits change', () => {
  const { input } = mount();
  const axes = jest.spyOn(decorations, 'drawImageDecorations');
  text.mockClear();
  act(() =>
    item.publish({
      ...input,
      source: { ...input.source!, data: new Uint16Array(10000).fill(50) },
    })
  );
  flush();
  expect(text.mock.calls.some(([label]) => label === '50')).toBe(true);
  expect(axes).not.toHaveBeenCalled();
});

test('resamples after fixed levels even if the source wrapper is unchanged', () => {
  const { input } = mount();
  input.plotConfig.color_levels = [0, 0];
  act(() => item.publish(input));
  flush();
  const sample = jest.spyOn(raster, 'sampleLimits');
  input.plotConfig.color_levels = [];
  act(() => item.publish(input));
  flush();
  expect(sample).toHaveBeenCalledWith(input.source);
});

test('removes and restores the colorbar when switching between grayscale and packed color', () => {
  const { input } = mount();
  expect(text.mock.calls.some(([label]) => label === '9999')).toBe(true);
  text.mockClear();
  act(() =>
    item.publish({
      ...input,
      source: {
        ...input.source!,
        color: true,
        channels: 4,
        encoding: Encoding.RGBA,
        data: new Uint8Array(40000),
      },
    })
  );
  flush();
  expect(text).not.toHaveBeenCalled();
  text.mockClear();
  act(() => item.publish(input));
  flush();
  expect(text.mock.calls.some(([label]) => label === '9999')).toBe(true);
});

test('clears the image-only placeholder when pixels arrive', () => {
  render(<Harness />);
  const input = { ...frame(), imageOnly: true };
  act(() =>
    item.publish({ ...input, source: undefined, placeholder: 'Image' })
  );
  flush();
  expect(text.mock.calls.some(([label]) => label === 'Image')).toBe(true);
  const draw = jest.spyOn(Konva.Layer.prototype, 'draw');
  text.mockClear();
  act(() => item.publish(input));
  flush();
  expect(text).not.toHaveBeenCalled();
  expect(draw).toHaveBeenCalledTimes(2);
  expect(upload).toHaveBeenCalledTimes(1);
});

test('refreshes cached decorations when canvas fonts finish loading and detaches on disposal', () => {
  const descriptor = Object.getOwnPropertyDescriptor(document, 'fonts');
  const fonts = new EventTarget();
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: fonts,
  });
  try {
    const { input, unmount } = mount();
    input.plotConfig.color_levels = [0, 9999];
    act(() => item.publish(input));
    flush();
    const axes = jest.spyOn(decorations, 'drawImageDecorations');
    text.mockClear();
    act(() => fonts.dispatchEvent(new Event('loadingdone')));
    flush();
    expect(axes).toHaveBeenCalledTimes(1);
    expect(text).toHaveBeenCalled();
    unmount();
    const schedule = jest.spyOn(window, 'requestAnimationFrame');
    fonts.dispatchEvent(new Event('loadingdone'));
    expect(schedule).not.toHaveBeenCalled();
  } finally {
    cleanup();
    if (descriptor) {
      Object.defineProperty(document, 'fonts', descriptor);
    } else {
      Reflect.deleteProperty(document, 'fonts');
    }
  }
});
