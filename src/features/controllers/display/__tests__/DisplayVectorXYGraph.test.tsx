import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { Chart } from 'chart.js/auto';
import {
  Chart as RealChart,
  BasicPlatform,
  registerables,
  type ScriptableContext,
} from 'chart.js';
import { VectorXYGraphModel } from '@/karabo/common/api';
import type { PropertyProxy } from '@/lib/binding/api';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import {
  buildModelConfig,
  GRAPH_LAYOUT,
  TRACE_COLORS,
} from '../../graph/common/api';
import { vectorXYChartOption } from '../../graph/plotConfig';
import DisplayVectorXYGraph from '../DisplayVectorXYGraph';
import { makeVectorProxy } from '../../graph/testing/vectorProxy';

const property = makeVectorProxy;
const context = (proxies: PropertyProxy[]) =>
  ({ proxies }) as ControllerContainerContext;
type MockChart = Chart<'line'> & { destroy: jest.Mock; update: jest.Mock };
const charts = () => (Chart as unknown as { instances: MockChart[] }).instances;
const chart = () => charts().at(-1)!;
const originalRequest = window.requestIdleCallback;
const originalCancel = window.cancelIdleCallback;
const flush = () => act(() => jest.runOnlyPendingTimers());

beforeEach(() => {
  charts().length = 0;
  jest.useFakeTimers();
  window.requestIdleCallback = jest.fn((callback: IdleRequestCallback) =>
    window.setTimeout(
      () => callback({ didTimeout: false, timeRemaining: () => 50 }),
      0
    )
  );
  window.cancelIdleCallback = jest.fn((id) => window.clearTimeout(id));
});
afterEach(() => {
  cleanup();
  window.requestIdleCallback = originalRequest;
  window.cancelIdleCallback = originalCancel;
  jest.useRealTimers();
});

test('pairs each Y independently, updates without recreation, and clears missing X or Y', () => {
  const model = new VectorXYGraphModel();
  model.keys = ['x', 'y', 'z'];
  const x = property([9, 5, 5]);
  const y = property([1, 2]);
  const z = property([3, 4, 5, 6]);
  const ctx = context([x, y, z]);
  const view = render(<DisplayVectorXYGraph model={model} ctx={ctx} />);
  flush();
  const first = chart();
  expect(first.data.datasets.map((s) => s.data)).toEqual([
    [
      { x: 9, y: 1 },
      { x: 5, y: 2 },
    ],
    [
      { x: 9, y: 3 },
      { x: 5, y: 4 },
      { x: 5, y: 5 },
    ],
  ]);
  expect(first.options).toMatchObject({ parsing: {}, normalized: false });
  expect(first.data.datasets.map((s) => s.borderColor)).toEqual(
    TRACE_COLORS.slice(0, 2)
  );
  y.binding!.setValue(undefined, undefined);
  view.rerender(<DisplayVectorXYGraph model={model} ctx={ctx} />);
  flush();
  expect(chart()).toBe(first);
  expect(first.data.datasets[0].data).toEqual([]);
  expect(first.data.datasets[1].data).toHaveLength(3);
  x.binding!.setValue([], undefined);
  view.rerender(<DisplayVectorXYGraph model={model} ctx={ctx} />);
  flush();
  expect(first.data.datasets.map((s) => s.data)).toEqual([[], []]);
  x.binding!.setValue(undefined, undefined);
  view.rerender(<DisplayVectorXYGraph model={model} ctx={ctx} />);
  flush();
  expect(first.data.datasets.map((s) => s.data)).toEqual([[], []]);
});

test('publishes replacement X and Y vectors and retains data on unchanged renders', () => {
  const model = new VectorXYGraphModel();
  model.keys = ['x', 'y'];
  const x = new Float64Array([1, 2]);
  const y = new Float64Array([3, 4]);
  const proxies = [property(x), property(y)];
  const ctx = context(proxies);
  const view = render(<DisplayVectorXYGraph model={model} ctx={ctx} />);
  flush();
  const first = chart();
  const update = first.update;
  update.mockClear();
  // An unchanged render retains the memoized X/Y split and sampled data.
  view.rerender(<DisplayVectorXYGraph model={model} ctx={ctx} />);
  expect(update).not.toHaveBeenCalled();
  proxies[0].binding!.setValue(new Float64Array([10, 2]), undefined);
  proxies[1].binding!.setValue(new Float64Array([30, 4]), undefined);
  view.rerender(<DisplayVectorXYGraph model={model} ctx={ctx} />);
  expect(first.data.datasets[0].data[0]).toEqual({ x: 1, y: 3 });
  flush();
  expect(chart()).toBe(first);
  expect(first.data.datasets[0].data).toEqual([
    { x: 10, y: 30 },
    { x: 2, y: 4 },
  ]);
});

test('restores multiple hidden curves with one visibility redraw on recreation', () => {
  const model = new VectorXYGraphModel();
  model.keys = ['x', 'y', 'z'];
  const ctx = context([property([1]), property([2]), property([3])]);
  const view = render(<DisplayVectorXYGraph model={model} ctx={ctx} />);
  flush();
  fireEvent.click(screen.getByRole('button', { name: 'y' }));
  fireEvent.click(screen.getByRole('button', { name: 'z' }));
  const replacement = new VectorXYGraphModel();
  replacement.keys = model.keys;
  view.rerender(<DisplayVectorXYGraph model={replacement} ctx={ctx} />);
  expect(chart().isDatasetVisible(0)).toBe(false);
  expect(chart().isDatasetVisible(1)).toBe(false);
  // One data update followed by one batched visibility update.
  expect(
    chart().update.mock.calls.filter(([mode]) => mode === 'none')
  ).toHaveLength(2);
});

test('preserves legend visibility by key through updates, curve reorder, and configuration changes', () => {
  const model = new VectorXYGraphModel();
  model.keys = ['x', 'y', 'z'];
  const ctx = context([property([1]), property([2]), property([3])]);
  const view = render(<DisplayVectorXYGraph model={model} ctx={ctx} />);
  flush();
  fireEvent.click(screen.getByRole('button', { name: 'z' }));
  expect(chart().isDatasetVisible(1)).toBe(false);
  const first = chart();
  ctx.proxies[1].binding!.setValue([4], undefined);
  view.rerender(<DisplayVectorXYGraph model={model} ctx={ctx} />);
  flush();
  expect(chart()).toBe(first);
  expect(chart().isDatasetVisible(1)).toBe(false);
  model.keys = ['x', 'z', 'y'];
  view.rerender(
    <DisplayVectorXYGraph
      model={model}
      ctx={context([ctx.proxies[0], ctx.proxies[2], ctx.proxies[1]])}
    />
  );
  flush();
  expect(first.destroy).toHaveBeenCalled();
  expect(chart().isDatasetVisible(0)).toBe(false);
  expect(chart().isDatasetVisible(1)).toBe(true);
  expect(screen.getByRole('button', { name: 'z' })).toHaveAttribute(
    'aria-pressed',
    'false'
  );
  const replacement = new VectorXYGraphModel();
  replacement.keys = model.keys;
  replacement.title = 'Changed';
  view.rerender(<DisplayVectorXYGraph model={replacement} ctx={ctx} />);
  expect(chart().isDatasetVisible(0)).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
  expect(chart().isDatasetVisible(0)).toBe(false);
});

test('defers data during gestures and restores configured ranges on reset', () => {
  const model = new VectorXYGraphModel();
  model.keys = ['x', 'y'];
  model.x_autorange = false;
  model.x_min = 10;
  model.x_max = 20;
  const x = property([10, 15, 20]);
  const y = property([1, 2, 3]);
  const ctx = context([x, y]);
  const rendered = render(<DisplayVectorXYGraph model={model} ctx={ctx} />);
  flush();
  const container = screen.getByTestId('vector-xy-chart');
  fireEvent.mouseDown(container, { button: 2, clientX: 90, clientY: 40 });
  y.binding!.setValue([9, 8], undefined);
  rendered.rerender(<DisplayVectorXYGraph model={model} ctx={ctx} />);
  flush();
  expect(chart().data.datasets[0].data).toEqual([
    { x: 10, y: 1 },
    { x: 15, y: 2 },
    { x: 20, y: 3 },
  ]);
  fireEvent.mouseMove(document, { button: 2, clientX: 120, clientY: 40 });
  fireEvent.mouseUp(document, { button: 2, clientX: 120, clientY: 40 });
  expect(chart().data.datasets[0].data).toEqual([
    { x: 10, y: 9 },
    { x: 15, y: 8 },
  ]);
  expect(chart().options.scales?.x?.min).not.toBe(10);
  fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
  expect(chart().options.scales?.x).toMatchObject({ min: 10, max: 20 });
});

test('selects marker sizes per dataset after sampling', () => {
  const config = vectorXYChartOption(
    buildModelConfig(new VectorXYGraphModel()),
    ['small', 'large']
  );
  for (const [index, length] of [299, 300].entries()) {
    const dataset = config.data.datasets[index];
    dataset.data = Array.from({ length }, (_, x) => ({ x, y: x }));
    const radius = dataset.pointRadius as (
      ctx: ScriptableContext<'line'>
    ) => number;
    expect(radius({ dataset } as ScriptableContext<'line'>)).toBe(
      index === 0 ? GRAPH_LAYOUT.vectorPointSize : 0
    );
  }
});

test('clips each paired length independently and resets a box zoom', () => {
  const model = new VectorXYGraphModel();
  model.keys = ['x', 'short', 'long'];
  model.x_autorange = false;
  model.x_min = 50;
  model.x_max = 100;
  const values = Float64Array.from({ length: 201 }, (_, i) => i);
  const ctx = context([
    property(values),
    property(new Float64Array(200)),
    property(values),
  ]);
  render(<DisplayVectorXYGraph model={model} ctx={ctx} />);
  flush();
  expect(chart().data.datasets.map((s) => s.data.length)).toEqual([200, 151]);
  expect(chart().data.datasets[1].data[0]).toEqual({ x: 0, y: 0 });
  expect(chart().data.datasets[1].data.at(-1)).toEqual({ x: 150, y: 150 });
  fireEvent.click(screen.getByRole('button', { name: 'Zoom' }));
  const container = screen.getByTestId('vector-xy-chart');
  fireEvent.mouseDown(container, { button: 0, clientX: 90, clientY: 40 });
  fireEvent.mouseMove(document, { button: 0, clientX: 120, clientY: 100 });
  fireEvent.mouseUp(document, { button: 0, clientX: 120, clientY: 100 });
  expect(chart().options.scales?.x?.min).toBeGreaterThan(50);
  expect(chart().options.scales?.x?.max).toBeLessThan(100);
  fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
  expect(chart().options.scales?.x).toMatchObject({ min: 50, max: 100 });
  expect(chart().data.datasets.map((s) => s.data.length)).toEqual([200, 151]);
});

test.each([
  { descending: false, max: 51.8 },
  { descending: true, max: 51.8 },
  { descending: false, max: 50.8 },
  { descending: true, max: 50.8 },
])(
  'keeps line boundary points through live updates with descending=$descending and max=$max',
  ({ descending, max }) => {
    const model = new VectorXYGraphModel();
    model.keys = ['x', 'y'];
    model.x_autorange = false;
    model.x_min = 50.2;
    model.x_max = max;
    const x = property(Float64Array.from({ length: 201 }, (_, i) => i));
    const y = property(new Float64Array(201).fill(1));
    const ctx = context([x, y]);
    const view = render(<DisplayVectorXYGraph model={model} ctx={ctx} />);
    flush();
    const current = chart();
    for (const shift of [0, 0.5, 0, 0.5]) {
      x.binding!.setValue(
        Float64Array.from(
          { length: 201 },
          (_, i) => (descending ? 200 - i : i) + shift
        ),
        undefined
      );
      y.binding!.setValue(new Float64Array(201).fill(shift + 1), undefined);
      view.rerender(<DisplayVectorXYGraph model={model} ctx={ctx} />);
      flush();
      const points = chart().data.datasets[0].data as {
        x: number;
        y: number;
      }[];
      const coordinates = points.map((point) => point.x);
      expect(Math.min(...coordinates)).toBeLessThanOrEqual(50.2);
      expect(Math.max(...coordinates)).toBeGreaterThanOrEqual(max);
      expect(chart()).toBe(current);
    }
  }
);

test.each([
  [3, 3, -4, 8],
  [3, -4, 8, 3],
])(
  'real Chart.js preserves X order %s, includes Y extrema, and clears datasets independently',
  (...x) => {
    RealChart.register(...registerables);
    const canvas = document.createElement('canvas');
    const drawing = new Proxy(
      {
        canvas,
        measureText: (text: string) => ({ width: String(text).length * 6 }),
      },
      {
        get: (target, key) => Reflect.get(target, key) ?? (() => undefined),
      }
    ) as unknown as CanvasRenderingContext2D;
    jest.spyOn(canvas, 'getContext').mockReturnValue(drawing);
    const config = vectorXYChartOption(
      buildModelConfig(new VectorXYGraphModel()),
      ['y', 'z']
    );
    const points = x.map((value, index) => ({
      x: value,
      y: [0, -50, 80, 1][index],
    }));
    config.data.datasets[0].data = points;
    config.data.datasets[1].data = [{ x: 0, y: 100 }];
    const real = new RealChart(canvas, {
      ...config,
      options: { ...config.options, responsive: false },
      platform: BasicPlatform,
    });
    try {
      expect(points.map((p) => p.x)).toEqual(x);
      expect(real.getDatasetMeta(0).data.map((point) => point.x)).toEqual(
        x.map((value) => real.scales.x.getPixelForValue(value))
      );
      expect(real.scales.y.min).toBeLessThanOrEqual(-50);
      expect(real.scales.y.max).toBeGreaterThanOrEqual(100);
      real.data.datasets[0].data = [];
      real.update('none');
      expect(real.getDatasetMeta(0).data).toHaveLength(0);
      expect(real.getDatasetMeta(1).data).toHaveLength(1);
      real.data.datasets[1].data = [];
      real.update('none');
      expect(real.getDatasetMeta(1).data).toHaveLength(0);
    } finally {
      real.destroy();
    }
  }
);
