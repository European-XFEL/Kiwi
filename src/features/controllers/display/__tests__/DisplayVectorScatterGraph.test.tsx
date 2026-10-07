import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { Chart } from 'chart.js/auto';
import { Chart as RealChart, BasicPlatform, registerables } from 'chart.js';
import { VectorScatterGraphModel } from '@/karabo/common/api';
import type { PropertyProxy } from '@/lib/binding/api';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import { buildModelConfig } from '../../graph/common/api';
import { vectorScatterChartOption } from '../../graph/plotConfig';
import { makeVectorProxy } from '../../graph/testing/vectorProxy';
import DisplayVectorScatterGraph from '../DisplayVectorScatterGraph';

type MockChart = Chart<'line'> & { destroy: jest.Mock; update: jest.Mock };
const charts = () => (Chart as unknown as { instances: MockChart[] }).instances;
const chart = () => charts().at(-1)!;
const context = (proxies: PropertyProxy[]) =>
  ({ proxies }) as ControllerContainerContext;
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

test('publishes one full paired frame on X or Y updates', () => {
  const model = new VectorScatterGraphModel();
  model.keys = ['x', 'y'];
  const x = makeVectorProxy([2.3, 4.5, 7.9]);
  const y = makeVectorProxy([1, 2, 3, 4]);
  const ctx = context([x, y]);
  const view = render(<DisplayVectorScatterGraph model={model} ctx={ctx} />);
  flush();
  const first = chart();
  expect(first.data.datasets).toHaveLength(1);
  expect(first.data.datasets[0].data).toEqual([
    { x: 2.3, y: 1 },
    { x: 4.5, y: 2 },
    { x: 7.9, y: 3 },
  ]);
  expect(first.data.datasets[0]).toMatchObject({
    showLine: false,
    pointRadius: 3.5,
    pointBackgroundColor: 'blue',
  });
  first.update.mockClear();
  x.binding!.setValue([9, 5], undefined);
  view.rerender(<DisplayVectorScatterGraph model={model} ctx={ctx} />);
  flush();
  expect(first.update).toHaveBeenCalledTimes(1);
  expect(first.data.datasets[0].data).toEqual([
    { x: 9, y: 1 },
    { x: 5, y: 2 },
  ]);
  y.binding!.setValue([10, 20, 30], undefined);
  view.rerender(<DisplayVectorScatterGraph model={model} ctx={ctx} />);
  flush();
  expect(chart()).toBe(first);
  expect(first.data.datasets[0].data).toEqual([
    { x: 9, y: 10 },
    { x: 5, y: 20 },
  ]);
});

test('retains every unordered point with a fixed marker size beyond line sampling thresholds', () => {
  const model = new VectorScatterGraphModel();
  model.keys = ['x', 'y'];
  model.psize = 2.7;
  model.x_autorange = false;
  model.x_min = 0;
  model.x_max = 10;
  const values = Float64Array.from({ length: 40_001 }, (_, i) =>
    i % 2 ? i : -i
  );
  render(
    <DisplayVectorScatterGraph
      model={model}
      ctx={context([makeVectorProxy(values), makeVectorProxy(values)])}
    />
  );
  flush();
  expect(chart().data.datasets[0].data).toHaveLength(values.length);
  expect(chart().data.datasets[0].data[20_000]).toEqual({
    x: -20_000,
    y: -20_000,
  });
  expect(chart().data.datasets[0].pointRadius).toBe(1.35);
});

test('clears empty and missing vectors and discards obsolete key frames', () => {
  const model = new VectorScatterGraphModel();
  model.keys = ['x', 'y'];
  const x = makeVectorProxy([1]);
  const y = makeVectorProxy([2]);
  const ctx = context([x, y]);
  const view = render(<DisplayVectorScatterGraph model={model} ctx={ctx} />);
  flush();
  x.binding!.setValue([], undefined);
  y.binding!.setValue([3], undefined);
  view.rerender(<DisplayVectorScatterGraph model={model} ctx={ctx} />);
  flush();
  expect(chart().data.datasets[0].data).toEqual([]);
  model.keys = ['other.x', 'other.y'];
  view.rerender(
    <DisplayVectorScatterGraph
      model={model}
      ctx={context([makeVectorProxy([8]), makeVectorProxy([9])])}
    />
  );
  expect(chart().data.datasets[0].data).toEqual([]);
  flush();
  expect(chart().data.datasets[0].data).toEqual([{ x: 8, y: 9 }]);
  view.rerender(<DisplayVectorScatterGraph model={model} ctx={context([x])} />);
  flush();
  expect(chart().data.datasets[0].data).toEqual([]);
});

test('coalesces equal-timestamp Y replacement and vector updates using the latest X', () => {
  const model = new VectorScatterGraphModel();
  model.keys = ['x', 'y'];
  const x = makeVectorProxy(new Float64Array([1]));
  const y = makeVectorProxy([2]);
  const view = render(
    <DisplayVectorScatterGraph model={model} ctx={context([x, y])} />
  );
  flush();
  const replacement = makeVectorProxy(new Float64Array([3]));
  replacement.binding!.timestamp = y.binding!.timestamp;
  view.rerender(
    <DisplayVectorScatterGraph model={model} ctx={context([x, replacement])} />
  );
  x.binding!.setValue(new Float64Array([10]), undefined);
  replacement.binding!.setValue(new Float64Array([30]), undefined);
  view.rerender(
    <DisplayVectorScatterGraph model={model} ctx={context([x, replacement])} />
  );
  expect(jest.getTimerCount()).toBe(1);
  flush();
  expect(chart().data.datasets[0].data).toEqual([{ x: 10, y: 30 }]);
});

test('defers a frame during navigation, cancels the gesture, and restores configured ranges', () => {
  const model = new VectorScatterGraphModel();
  model.keys = ['x', 'y'];
  Object.assign(model, {
    x_autorange: false,
    x_min: 1,
    x_max: 10,
    x_log: true,
    y_log: true,
    y_invert: true,
  });
  const x = makeVectorProxy([1, 10]);
  const y = makeVectorProxy([2, 20]);
  const ctx = context([x, y]);
  const view = render(<DisplayVectorScatterGraph model={model} ctx={ctx} />);
  flush();
  fireEvent.mouseDown(screen.getByTestId('vector-scatter-chart'), {
    button: 2,
    clientX: 90,
    clientY: 40,
  });
  y.binding!.setValue([3, 30], undefined);
  view.rerender(<DisplayVectorScatterGraph model={model} ctx={ctx} />);
  flush();
  expect(chart().data.datasets[0].data[0]).toEqual({ x: 1, y: 2 });
  fireEvent.mouseMove(document, { button: 2, clientX: 120, clientY: 40 });
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(chart().data.datasets[0].data[0]).toEqual({ x: 1, y: 3 });
  fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
  expect(chart().options.scales?.x).toMatchObject({
    type: 'logarithmic',
    min: 1,
    max: 10,
  });
  expect(chart().options.scales?.y).toMatchObject({
    type: 'logarithmic',
    reverse: true,
  });
});

test('cleans up charts and pending publications in Strict Mode', () => {
  const model = new VectorScatterGraphModel();
  model.keys = ['x', 'y'];
  const view = render(
    <React.StrictMode>
      <DisplayVectorScatterGraph
        model={model}
        ctx={context([makeVectorProxy([1]), makeVectorProxy([2])])}
      />
    </React.StrictMode>
  );
  flush();
  expect(chart().data.datasets[0].data).toEqual([{ x: 1, y: 2 }]);
  const current = chart();
  view.rerender(
    <React.StrictMode>
      <DisplayVectorScatterGraph
        model={model}
        ctx={context([makeVectorProxy([3]), makeVectorProxy([4])])}
      />
    </React.StrictMode>
  );
  view.unmount();
  expect(current.destroy).toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

test('real Chart.js renders repeated, unordered coordinates with uniform scatter markers', () => {
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
  const config = vectorScatterChartOption(
    buildModelConfig(new VectorScatterGraphModel()),
    ['y']
  );
  const points = [
    { x: 3, y: 0 },
    { x: 3, y: -50 },
    { x: -4, y: 80 },
    { x: 8, y: 1 },
  ];
  config.data.datasets[0].data = points;
  const real = new RealChart(canvas, {
    ...config,
    options: { ...config.options, responsive: false },
    platform: BasicPlatform,
  });
  try {
    expect(real.getDatasetMeta(0).data.map((point) => point.x)).toEqual(
      points.map(({ x }) => real.scales.x.getPixelForValue(x))
    );
    expect(real.scales.y.min).toBeLessThanOrEqual(-50);
    expect(real.scales.y.max).toBeGreaterThanOrEqual(80);
    for (const point of real.getDatasetMeta(0).data) {
      expect(point.options).toMatchObject({
        radius: 3.5,
        backgroundColor: 'blue',
        borderWidth: 0,
      });
    }
  } finally {
    real.destroy();
  }
});
