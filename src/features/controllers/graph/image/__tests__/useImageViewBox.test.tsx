import { ImageGraphModel, buildModelConfig } from '@/karabo/common/api';
import { useRef } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';

import type { ImageSource } from '../raster';
import { useImageViewBox } from '../useImageViewBox';

let resize: (width: number, height: number) => void;
let disconnect: jest.Mock;
const requestDraw = jest.fn();
beforeEach(() => {
  jest.useFakeTimers();
  requestDraw.mockClear();
  disconnect = jest.fn();
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
const initialSource = { width: 100, height: 100, color: false };
let view: ReturnType<typeof useImageViewBox>;
function Harness({
  model,
  source = initialSource,
  identity = initialSource,
  imageOnly = false,
}: {
  model: ImageGraphModel;
  source?: Pick<ImageSource, 'width' | 'height' | 'color'>;
  identity?: unknown;
  imageOnly?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  view = useImageViewBox({
    containerRef,
    source,
    plotConfig: buildModelConfig(model),
    identity,
    imageOnly,
    requestDraw,
  });
  return (
    <div ref={containerRef} data-testid="view">
      <div ref={view.selectionRef} />
    </div>
  );
}
const flush = () =>
  act(() => {
    jest.advanceTimersByTime(32);
    view.readView();
  });
function mount(model = new ImageGraphModel()) {
  model.aspect_ratio = 0;
  const result = render(<Harness model={model} />);
  resize(800, 600);
  flush();
  return { ...result, model, element: result.getByTestId('view') };
}
function ranges() {
  return view.readView().ranges;
}
function drag(
  element: HTMLElement,
  button: number,
  start: [number, number],
  end: [number, number]
) {
  fireEvent.mouseDown(element, {
    button,
    clientX: start[0],
    clientY: start[1],
  });
  fireEvent.mouseMove(document, { clientX: end[0], clientY: end[1] });
  fireEvent.mouseUp(document, { button, clientX: end[0], clientY: end[1] });
  flush();
}

test('starts in Pointer, zooms a rectangle, pans, and resets without changing the selected tool', () => {
  const { element } = mount();
  expect(view.tool).toBe('pointer');
  expect(ranges()).toEqual({ x: [0, 100], y: [0, 100] });
  act(() => view.selectTool('zoom'));
  drag(element, 0, [200, 200], [400, 400]);
  expect(ranges().x[1] - ranges().x[0]).toBeLessThan(50);
  expect(ranges().y[0]).toBeLessThan(ranges().y[1]);
  const zoomed = ranges();
  drag(element, 1, [300, 300], [330, 330]);
  expect(ranges().x[0]).toBeLessThan(zoomed.x[0]);
  expect(ranges().y[0]).toBeLessThan(zoomed.y[0]);
  drag(element, 1, [300, 300], [300, 300]);
  expect(ranges()).toEqual({ x: [0, 100], y: [0, 100] });
  expect(view.tool).toBe('zoom');
});

test('keeps the cursor anchored during wheel zoom and supports right-drag zoom', () => {
  const { element } = mount();
  const bounds = view.viewport.readBounds()!;
  const x = bounds.left + (bounds.right - bounds.left) / 4;
  const y = bounds.top + (bounds.bottom - bounds.top) / 4;
  fireEvent.wheel(element, { clientX: x, clientY: y, deltaY: -100 });
  flush();
  expect(ranges().x[0] + (ranges().x[1] - ranges().x[0]) / 4).toBeCloseTo(25);
  const span = ranges().x[1] - ranges().x[0];
  drag(element, 2, [300, 300], [330, 270]);
  expect(ranges().x[1] - ranges().x[0]).toBeLessThan(span);
});

test('applies square-pixel and equal-unit aspect locks during every navigation', () => {
  const { model, rerender, element } = mount();
  for (const mode of [1, 2]) {
    model.aspect_ratio = mode;
    model.x_scale = 2;
    model.y_scale = 3;
    rerender(<Harness model={model} />);
    act(() => view.reset());
    flush();
    const bounds = view.viewport.readBounds()!;
    const ratio =
      ((bounds.right - bounds.left) / (bounds.bottom - bounds.top)) *
      (mode === 2 ? 1.5 : 1);
    act(() => view.selectTool('zoom'));
    drag(element, 0, [200, 200], [400, 300]);
    expect(
      (ranges().x[1] - ranges().x[0]) / (ranges().y[1] - ranges().y[0])
    ).toBeCloseTo(ratio);
    drag(element, 2, [300, 300], [330, 290]);
    expect(
      (ranges().x[1] - ranges().x[0]) / (ranges().y[1] - ranges().y[0])
    ).toBeCloseTo(ratio);
  }
});

test('locked right dragging horizontally zooms both axes', () => {
  const { element, model, rerender } = mount();
  model.aspect_ratio = 1;
  rerender(<Harness model={model} />);
  act(() => view.reset());
  flush();
  const initial = ranges();
  drag(element, 2, [300, 300], [340, 300]);
  expect(ranges().x[1] - ranges().x[0]).toBeLessThan(
    initial.x[1] - initial.x[0]
  );
  expect(ranges().y[1] - ranges().y[0]).toBeLessThan(
    initial.y[1] - initial.y[0]
  );
});

test('locked right zoom changes continuously when a drag crosses the diagonal', () => {
  const { element, model, rerender } = mount();
  model.aspect_ratio = 1;
  rerender(<Harness model={model} />);
  act(() => view.reset());
  flush();
  const initialSpan = ranges().x[1] - ranges().x[0];
  fireEvent.mouseDown(element, { button: 2, clientX: 300, clientY: 300 });
  fireEvent.mouseMove(document, { clientX: 340, clientY: 339 });
  flush();
  const width = ranges().x[1] - ranges().x[0];
  fireEvent.mouseMove(document, { clientX: 340, clientY: 341 });
  flush();
  expect(ranges().x[1] - ranges().x[0]).toBeCloseTo(width);
  expect(width).toBeLessThan(initialSpan * 0.5);
});

test('accounts for scene CSS scaling in selection and wheel zoom', () => {
  const { element } = mount();
  Object.defineProperties(element, {
    offsetWidth: { value: 800 },
    offsetHeight: { value: 600 },
  });
  jest.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    left: 20,
    top: 30,
    width: 1600,
    height: 1200,
  } as DOMRect);
  const bounds = view.viewport.readBounds()!;
  act(() => view.selectTool('zoom'));
  const start: [number, number] = [
    20 + 2 * (bounds.left + (bounds.right - bounds.left) / 4),
    30 + 2 * (bounds.top + (bounds.bottom - bounds.top) / 4),
  ];
  const end: [number, number] = [
    20 + 2 * (bounds.left + ((bounds.right - bounds.left) * 3) / 4),
    30 + 2 * (bounds.top + ((bounds.bottom - bounds.top) * 3) / 4),
  ];
  drag(element, 0, start, end);
  expect(ranges().x[0]).toBeCloseTo(25);
  expect(ranges().x[1]).toBeCloseTo(75);
  fireEvent.wheel(element, {
    clientX: start[0],
    clientY: start[1],
    deltaY: -100,
  });
  flush();
  expect(ranges().x[0] + (ranges().x[1] - ranges().x[0]) / 4).toBeCloseTo(37.5);
});

test.each([
  [40, 0, true],
  [-40, 0, false],
  [0, -40, true],
  [0, 40, false],
  [40, 40, true],
  [-40, -40, false],
  [40, -40, true],
  [-40, 40, false],
] as const)(
  'locked right zoom responds to a drag by (%s, %s)',
  (dx, dy, zoomIn) => {
    const { element, model, rerender } = mount();
    model.aspect_ratio = 1;
    rerender(<Harness model={model} />);
    act(() => view.reset());
    flush();
    const initial = ranges();
    drag(element, 2, [300, 300], [300 + dx, 300 + dy]);
    const factor = 1.02 ** (zoomIn ? -40 : 40);
    expect(ranges().x[1] - ranges().x[0]).toBeCloseTo(
      (initial.x[1] - initial.x[0]) * factor
    );
    expect(ranges().y[1] - ranges().y[0]).toBeCloseTo(
      (initial.y[1] - initial.y[0]) * factor
    );
  }
);

test('locked right zoom retains its initial vertical axis and reverses along it', () => {
  const { element, model, rerender } = mount();
  model.aspect_ratio = 1;
  rerender(<Harness model={model} />);
  act(() => view.reset());
  flush();
  const initial = ranges();
  fireEvent.mouseDown(element, { button: 2, clientX: 300, clientY: 300 });
  fireEvent.mouseMove(document, { clientX: 301, clientY: 299 });
  fireEvent.mouseMove(document, { clientX: 310, clientY: 260 });
  flush();
  const span = ranges().x[1] - ranges().x[0];
  expect(span).toBeLessThan(initial.x[1] - initial.x[0]);
  fireEvent.mouseMove(document, { clientX: 360, clientY: 260 });
  flush();
  expect(ranges().x[1] - ranges().x[0]).toBeCloseTo(span);
  fireEvent.mouseUp(document, { button: 2, clientX: 360, clientY: 340 });
  flush();
  expect(ranges().x[1] - ranges().x[0]).toBeGreaterThan(
    initial.x[1] - initial.x[0]
  );
  const before = ranges().x[1] - ranges().x[0];
  drag(element, 2, [300, 300], [340, 300]);
  expect(ranges().x[1] - ranges().x[0]).toBeCloseTo(before * 1.02 ** -40);
});

test('reads the latest geometry after resize and keeps navigation when a new frame has the same dimensions', () => {
  const { model, rerender } = mount();
  const readView = view.readView;
  const viewport = view.viewport;
  act(() => view.viewport.setRanges({ x: [25, 75], y: [25, 75] }));
  resize(1000, 700);
  expect(view.readView().size).toEqual({ width: 1000, height: 700 });
  expect(view.readView().bounds).toEqual({
    left: 72,
    right: 912,
    top: 52,
    bottom: 680,
  });
  rerender(<Harness model={model} source={{ ...initialSource }} />);
  expect(ranges()).toEqual({ x: [25, 75], y: [25, 75] });
  expect(view.readView).toBe(readView);
  expect(view.viewport).toBe(viewport);
  expect(requestDraw).toHaveBeenCalled();
});

test('resets on dimension or source identity changes and disconnects on unmount', () => {
  const { model, rerender, unmount } = mount();
  act(() => view.viewport.setRanges({ x: [25, 75], y: [25, 75] }));
  rerender(
    <Harness
      model={model}
      source={{ ...initialSource, width: 200, height: 50 }}
    />
  );
  expect(ranges()).toEqual({ x: [0, 200], y: [0, 50] });
  act(() => view.viewport.setRanges({ x: [25, 75], y: [25, 75] }));
  rerender(<Harness model={model} identity={{}} />);
  expect(ranges()).toEqual({ x: [0, 100], y: [0, 100] });
  unmount();
  expect(disconnect).toHaveBeenCalledTimes(1);
});

test.each(['Escape', 'blur'])('cancels a pan with %s', (cancel) => {
  const { element } = mount();
  act(() => view.selectTool('pan'));
  const initial = ranges();
  fireEvent.mouseDown(element, { button: 0, clientX: 200, clientY: 200 });
  fireEvent.mouseMove(document, { clientX: 240, clientY: 230 });
  flush();
  expect(ranges()).not.toEqual(initial);
  if (cancel === 'Escape') fireEvent.keyDown(document, { key: 'Escape' });
  else fireEvent.blur(window);
  expect(ranges()).toEqual(initial);
});

test('webcam fits the source while disabling mouse and wheel navigation', () => {
  const model = new ImageGraphModel();
  const { getByTestId } = render(
    <Harness
      model={model}
      imageOnly
      source={{ width: 200, height: 50, color: true }}
    />
  );
  resize(400, 300);
  expect(view.viewport.readBounds()).toBeUndefined();
  const initial = ranges();
  expect(initial).toEqual({ x: [0, 200], y: [-50, 100] });
  drag(getByTestId('view'), 2, [100, 100], [140, 100]);
  fireEvent.wheel(getByTestId('view'), {
    clientX: 100,
    clientY: 100,
    deltaY: -100,
  });
  expect(ranges()).toEqual(initial);
});

test.each(['reset', 'dimensions'])(
  'cancels an active gesture before applying %s',
  (change) => {
    const { element, model, rerender } = mount();
    act(() => view.selectTool('pan'));
    fireEvent.mouseDown(element, { button: 0, clientX: 200, clientY: 200 });
    fireEvent.mouseMove(document, { clientX: 240, clientY: 230 });
    flush();
    if (change === 'reset') act(() => view.reset());
    else
      rerender(
        <Harness
          model={model}
          source={{ ...initialSource, width: 200, height: 50 }}
        />
      );
    flush();
    expect(ranges()).toEqual({
      x: [0, change === 'reset' ? 100 : 200],
      y: [0, change === 'reset' ? 100 : 50],
    });
    fireEvent.mouseUp(document, { button: 0, clientX: 280, clientY: 230 });
    flush();
    expect(ranges()).toEqual({
      x: [0, change === 'reset' ? 100 : 200],
      y: [0, change === 'reset' ? 100 : 50],
    });
  }
);
