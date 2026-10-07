import { buildModelConfig } from '../../graph/common/api';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { Chart } from 'chart.js/auto';
import type { ScriptableContext } from 'chart.js';
import { Chart as RealChart, BasicPlatform, registerables } from 'chart.js';
import { ScatterGraphModel } from '@/karabo/common/api';
import { AccessLevel, Timestamp } from '@/karabo/data/api';
import {
  BaseBinding,
  BindingRoot,
  DeviceProxy,
  PropertyProxy,
} from '@/lib/binding/api';
import { useScatterData } from '../../graph/useScatterData';
import { vectorPoints } from '../../graph/utils';
import { scatterChartOption } from '../../graph/plotConfig';
import DisplayScatterGraph from '../DisplayScatterGraph';

function property(path: string) {
  const root = new DeviceProxy('scatter');
  root.binding = new BindingRoot();
  const binding = new BaseBinding();
  root.binding.value!.set(path, binding);
  const proxy = new PropertyProxy(root, path);
  return {
    proxy,
    send(value: unknown, time?: number | bigint) {
      binding.value = { value_: value };
      binding.timestamp = time === undefined ? undefined : new Timestamp(time);
      binding.value_update.fire(binding.value, binding.timestamp);
    },
    removeBinding() {
      root.binding.value!.clear_namespace();
      root.schema_update.fire();
    },
  };
}

function renderData(x: PropertyProxy, y?: PropertyProxy, maxlen = 100) {
  const hook = renderHook(
    ({ proxies, limit }) =>
      useScatterData({ proxies, keys: ['x', 'y'], maxlen: limit }),
    { initialProps: { proxies: y ? [x, y] : [x], limit: maxlen } }
  );
  return {
    ...hook,
    publish: (nextY = y, limit = maxlen) =>
      hook.rerender({ proxies: nextY ? [x, nextY] : [x], limit }),
  };
}

describe('scatter idle publication', () => {
  const originalRequest = window.requestIdleCallback;
  const originalCancel = window.cancelIdleCallback;

  beforeEach(() => {
    jest.useFakeTimers();
    window.requestIdleCallback = jest.fn((callback: IdleRequestCallback) =>
      window.setTimeout(
        () => callback({ didTimeout: false, timeRemaining: () => 50 }),
        0
      )
    );
    window.cancelIdleCallback = jest.fn((id: number) =>
      window.clearTimeout(id)
    );
  });

  afterEach(() => {
    cleanup();
    window.requestIdleCallback = originalRequest;
    window.cancelIdleCallback = originalCancel;
    jest.useRealTimers();
  });

  it('collects every rendered sample while coalescing series publication', () => {
    const x = property('x');
    const y = property('y');
    const { result, publish } = renderData(x.proxy, y.proxy, 3);
    const initialSeries = result.current.ySeries;
    const xBuffer = result.current.xValues;
    const yBuffer = initialSeries[0].values;
    x.send(5);
    for (let time = 1; time <= 4; time++) {
      y.send(time, time);
      publish();
    }
    expect(
      vectorPoints([result.current.xValues, result.current.ySeries[0].values])
    ).toEqual([
      { x: 5, y: 2 },
      { x: 5, y: 3 },
      { x: 5, y: 4 },
    ]);
    expect(result.current.ySeries).toBe(initialSeries);
    expect(window.requestIdleCallback).toHaveBeenCalledTimes(1);
    expect(window.requestIdleCallback).toHaveBeenCalledWith(
      expect.any(Function),
      { timeout: 1000 }
    );
    act(() => jest.runOnlyPendingTimers());
    expect(result.current.ySeries).not.toBe(initialSeries);
    expect(result.current.xValues).toBe(xBuffer);
    expect(result.current.ySeries[0].values).toBe(yBuffer);
    const publishedSeries = result.current.ySeries;

    y.send(5, 5);
    publish();
    act(() => jest.runOnlyPendingTimers());
    expect(result.current.ySeries).not.toBe(publishedSeries);
    expect(result.current.ySeries[0].values).toBe(yBuffer);
    expect(
      vectorPoints([
        result.current.xValues,
        result.current.ySeries[0].values,
      ]).at(-1)
    ).toEqual({ x: 5, y: 5 });
  });

  it('clears immediately without replaying a pending publication', () => {
    const x = property('x');
    const y = property('y');
    const { result, publish } = renderData(x.proxy, y.proxy);
    x.send(1);
    y.send(2, 1);
    publish();
    const pendingSeries = result.current.ySeries;
    act(() => result.current.clear());
    expect(
      vectorPoints([result.current.xValues, result.current.ySeries[0].values])
    ).toEqual([]);
    const clearedSeries = result.current.ySeries;
    expect(clearedSeries).not.toBe(pendingSeries);
    act(() => jest.runOnlyPendingTimers());
    expect(result.current.ySeries).toBe(clearedSeries);
    expect(
      vectorPoints([result.current.xValues, result.current.ySeries[0].values])
    ).toEqual([]);
  });

  it('redraws scalar history only at idle and clears the rendered chart immediately', () => {
    const model = new ScatterGraphModel();
    model.keys = ['x', 'y'];
    const x = property('x');
    const y = property('y');
    const ctx = {
      proxy: x.proxy,
      proxies: [x.proxy, y.proxy],
      userAccessLevel: AccessLevel.OBSERVER,
    };
    const controller = () => <DisplayScatterGraph model={model} ctx={ctx} />;
    const view = render(controller());
    const chart = (
      Chart as unknown as { instances: Chart<'scatter'>[] }
    ).instances.at(-1)!;
    x.send(5, 1);
    for (let time = 1; time <= 3; time++) {
      y.send(time, time);
      view.rerender(controller());
    }
    expect(chart.data.datasets[0].data).toEqual([]);
    act(() => jest.runOnlyPendingTimers());
    expect(chart.data.datasets[0].data).toEqual([
      { x: 5, y: 1 },
      { x: 5, y: 2 },
      { x: 5, y: 3 },
    ]);
    y.send(4, 4);
    view.rerender(controller());
    fireEvent.click(screen.getByRole('button', { name: 'Clear points' }));
    expect(chart.data.datasets[0].data).toEqual([]);
    act(() => jest.runOnlyPendingTimers());
    expect(chart.data.datasets[0].data).toEqual([]);
    x.send(2, 2);
    y.send(5, 5);
    view.rerender(controller());
    expect(chart.data.datasets[0].data).toEqual([]);
    act(() => jest.runOnlyPendingTimers());
    expect(chart.data.datasets[0].data).toEqual([{ x: 2, y: 5 }]);
  });

  it('cancels pending publication on unmount', () => {
    const x = property('x');
    const y = property('y');
    const { publish, unmount } = renderData(x.proxy, y.proxy);
    x.send(1);
    y.send(2, 1);
    publish();
    const requestId = (window.requestIdleCallback as jest.Mock).mock.results[0]
      .value;
    unmount();
    expect(window.cancelIdleCallback).toHaveBeenCalledWith(requestId);
  });
});

test('renders unordered pairs, repeated clears and resumed collection with real Chart.js', () => {
  RealChart.register(...registerables);
  const x = property('x');
  const y = property('y');
  const { result, publish } = renderData(x.proxy, y.proxy);
  const canvas = document.createElement('canvas');
  // Stub drawing only; keep Chart.js parsing and controller updates real.
  const context = new Proxy(
    {
      canvas,
      measureText: (text: string) => ({ width: String(text).length * 6 }),
    },
    {
      get: (target, key) => Reflect.get(target, key) ?? (() => undefined),
    }
  ) as unknown as CanvasRenderingContext2D;
  jest.spyOn(canvas, 'getContext').mockReturnValue(context);
  const config = scatterChartOption(buildModelConfig(new ScatterGraphModel()));
  config.data.datasets[0].data = vectorPoints([
    result.current.xValues,
    result.current.ySeries[0].values,
  ]);
  const chart = new RealChart(canvas, {
    ...config,
    options: { ...config.options, responsive: false },
    platform: BasicPlatform,
  });
  const update = () => {
    chart.data.datasets[0].data = vectorPoints([
      result.current.xValues,
      result.current.ySeries[0].values,
    ]);
    chart.update('none');
  };
  try {
    x.send(5, 1);
    y.send(2, 1);
    publish();
    update();
    expect(chart.getDatasetMeta(0).data).toHaveLength(1);
    x.send(1, 2);
    y.send(3, 2);
    publish();
    update();
    const markers = chart.getDatasetMeta(0).data;
    expect(markers.map((point) => point.options.backgroundColor)).toEqual([
      'blue',
      'red',
    ]);
    expect(markers.map((point) => point.x)).toEqual(
      [5, 1].map((value) => chart.scales.x.getPixelForValue(value))
    );
    act(() => result.current.clear());
    update();
    expect(chart.getDatasetMeta(0).data).toHaveLength(0);
    // Repeated clears and collection after clearing must also be safe.
    act(() => result.current.clear());
    update();
    x.send(3, 3);
    y.send(4, 3);
    publish();
    update();
    expect(chart.getDatasetMeta(0).data).toHaveLength(1);
    y.removeBinding();
    publish();
    update();
    expect(chart.getDatasetMeta(0).data).toHaveLength(0);
  } finally {
    chart.destroy();
  }
});

test('pairs published Y updates with latest X, deduplicates and evicts oldest points', () => {
  const x = property('x');
  const y = property('y');
  const { result, publish } = renderData(x.proxy, y.proxy, 3);
  const xBuffer = result.current.xValues;
  const yBuffer = result.current.ySeries[0].values;
  y.send(9, 1);
  publish();
  expect(
    vectorPoints([result.current.xValues, result.current.ySeries[0].values])
  ).toEqual([]);
  x.send(3);
  y.send(10, 2);
  publish();
  y.send(99, 2);
  publish();
  x.send(4);
  y.send(11, 3);
  publish();
  y.send(12, 4);
  publish();
  expect(
    vectorPoints([result.current.xValues, result.current.ySeries[0].values])
  ).toEqual([
    { x: 3, y: 10 },
    { x: 4, y: 11 },
    { x: 4, y: 12 },
  ]);
  y.send(13, 5);
  publish();
  expect(
    vectorPoints([result.current.xValues, result.current.ySeries[0].values])
  ).toEqual([
    { x: 4, y: 11 },
    { x: 4, y: 12 },
    { x: 4, y: 13 },
  ]);
  publish(y.proxy, 1);
  expect(
    vectorPoints([result.current.xValues, result.current.ySeries[0].values])
  ).toEqual([{ x: 4, y: 13 }]);
  expect(result.current.xValues).toBe(xBuffer);
  expect(result.current.ySeries[0].values).toBe(yBuffer);
  act(() => result.current.clear());
  expect(result.current.xValues).toBe(xBuffer);
  expect(result.current.ySeries[0].values).toBe(yBuffer);
  expect(xBuffer).toEqual([]);
  expect(yBuffer).toEqual([]);
});

test('collects only the latest values when notifications are batched before a render', () => {
  const x = property('x');
  const y = property('y');
  const valueUpdate = jest.spyOn(y.proxy, 'value_update');
  const bindingUpdate = jest.spyOn(y.proxy, 'binding_update');
  const { result, publish } = renderData(x.proxy, y.proxy);
  x.send(1);
  y.send(2, 1);
  y.send(3, 2);
  x.send(4);
  expect(
    vectorPoints([result.current.xValues, result.current.ySeries[0].values])
  ).toEqual([]);
  publish();
  expect(
    vectorPoints([result.current.xValues, result.current.ySeries[0].values])
  ).toEqual([{ x: 4, y: 3 }]);
  expect(valueUpdate).not.toHaveBeenCalled();
  expect(bindingUpdate).not.toHaveBeenCalled();
});

test('accepts booleans and numeric values, ignores invalid values and missing timestamps', () => {
  const x = property('x');
  const y = property('y');
  const { result, publish } = renderData(x.proxy, y.proxy);
  x.send(false);
  y.send(true, 1);
  publish();
  y.send(2n, 2);
  publish();
  y.send(8);
  publish();
  for (const [index, value] of [
    NaN,
    Infinity,
    '3',
    null,
    undefined,
    [],
    {},
  ].entries()) {
    y.send(value, index + 3);
    publish();
  }
  x.send(NaN);
  y.send(4, 20);
  publish();
  x.send('4');
  y.send(5, 21);
  publish();
  x.send(0);
  y.send(false, 22);
  publish();
  expect(
    vectorPoints([result.current.xValues, result.current.ySeries[0].values])
  ).toEqual([
    { x: 0, y: 1 },
    { x: 0, y: 2 },
    { x: 0, y: 0 },
  ]);
});

test('deduplicates timestamps without losing sub-millisecond precision', () => {
  const x = property('x');
  const y = property('y');
  const { result, publish } = renderData(x.proxy, y.proxy);
  x.send(1);
  y.send(1, 1800000000000000000000000000n);
  publish();
  y.send(2, 1800000000000000000000000001n);
  publish();
  y.send(3, 1800000000000000000000000001n);
  publish();
  expect(
    vectorPoints([result.current.xValues, result.current.ySeries[0].values])
  ).toEqual([
    { x: 1, y: 1 },
    { x: 1, y: 2 },
  ]);
});

test('clears on Y removal/replacement', () => {
  const x = property('x');
  const y = property('y');
  const replacement = property('newY');
  x.send(1);
  const { result, rerender, publish } = renderData(x.proxy, y.proxy);
  y.send(2, 1);
  publish();
  expect(
    vectorPoints([result.current.xValues, result.current.ySeries[0].values])
  ).toHaveLength(1);
  publish(replacement.proxy);
  expect(
    vectorPoints([result.current.xValues, result.current.ySeries[0].values])
  ).toEqual([]);
  replacement.send(4, 1);
  publish(replacement.proxy);
  expect(
    vectorPoints([result.current.xValues, result.current.ySeries[0].values])
  ).toEqual([{ x: 1, y: 4 }]);
  rerender({ proxies: [x.proxy], limit: 100 });
  expect(
    vectorPoints([result.current.xValues, result.current.ySeries[0].values])
  ).toEqual([]);
});

test('clears when Y binding disappears and ignores a removed X binding', () => {
  const x = property('x');
  const y = property('y');
  const { result, publish } = renderData(x.proxy, y.proxy);
  x.send(1);
  y.send(2, 1);
  publish();
  x.removeBinding();
  y.send(3, 2);
  publish();
  expect(
    vectorPoints([result.current.xValues, result.current.ySeries[0].values])
  ).toEqual([{ x: 1, y: 2 }]);
  y.removeBinding();
  publish();
  expect(
    vectorPoints([result.current.xValues, result.current.ySeries[0].values])
  ).toEqual([]);
});

test('Clear points waits for a new X update and does not replay Y', () => {
  const x = property('x');
  const y = property('y');
  const { result, publish } = renderData(x.proxy, y.proxy);
  x.send(1, 1);
  y.send(2, 1);
  publish();
  act(() => result.current.clear());
  publish();
  y.send(3, 2);
  publish();
  expect(
    vectorPoints([result.current.xValues, result.current.ySeries[0].values])
  ).toEqual([]);
  x.send(1, 2);
  publish();
  expect(
    vectorPoints([result.current.xValues, result.current.ySeries[0].values])
  ).toEqual([]);
  y.send(5, 3);
  publish();
  expect(
    vectorPoints([result.current.xValues, result.current.ySeries[0].values])
  ).toEqual([{ x: 1, y: 5 }]);
});

test('configures point diameter, newest-point color, and unsorted X data', () => {
  const model = new ScatterGraphModel();
  model.psize = 12;
  const config = scatterChartOption(buildModelConfig(model));
  expect(config.type).toBe('scatter');
  const dataset = config.data.datasets[0];
  expect(dataset).toMatchObject({
    showLine: false,
    pointRadius: 6,
    pointBorderWidth: 0,
  });
  expect(config.options).toMatchObject({ parsing: {}, normalized: false });
  dataset.data = [
    { x: 5, y: 1 },
    { x: 1, y: 2 },
    { x: 1, y: 3 },
  ];
  const color = dataset.pointBackgroundColor as (
    ctx: ScriptableContext<'scatter'>
  ) => string;
  expect(
    [0, 1, 2].map((dataIndex) =>
      color({ dataIndex, dataset } as ScriptableContext<'scatter'>)
    )
  ).toEqual(['blue', 'blue', 'red']);
});

test('uses scene settings, ignores extra proxies, retains navigation ranges on clear, resets and cleans up', () => {
  const model = new ScatterGraphModel();
  Object.assign(model, {
    title: 'Position',
    background: '#123456',
    x_log: true,
    y_invert: true,
    x_autorange: false,
    x_min: 1,
    x_max: 100,
    y_autorange: false,
    y_min: 0,
    y_max: 10,
  });
  const x = property('x');
  const y = property('y');
  const extra = property('extra');
  const controller = () => (
    <DisplayScatterGraph
      model={model}
      ctx={{
        proxy: x.proxy,
        proxies: [x.proxy, y.proxy, extra.proxy],
        userAccessLevel: AccessLevel.OBSERVER,
      }}
    />
  );
  const { unmount, rerender } = render(controller());
  const chart = (
    Chart as unknown as { instances: Chart<'scatter'>[] }
  ).instances.at(-1)!;
  expect(screen.getByText('Position')).toBeInTheDocument();
  expect(
    screen.getByTestId('scatter-chart').parentElement?.parentElement
      ?.parentElement
  ).toHaveStyle({ backgroundColor: '#123456' });
  expect(chart.options.scales?.x).toMatchObject({
    type: 'logarithmic',
    min: 1,
    max: 100,
  });
  expect(chart.options.scales?.y).toMatchObject({
    reverse: true,
    min: 0,
    max: 10,
  });
  const updateChart = jest.spyOn(chart, 'update');
  updateChart.mockClear();
  act(() => {
    x.send(5);
    y.send(2, 1);
    extra.send(99, 2);
  });
  rerender(controller());
  expect(chart.data.datasets[0].data).toEqual([{ x: 5, y: 2 }]);
  expect(updateChart).toHaveBeenCalledWith('none');
  fireEvent.click(screen.getByRole('button', { name: 'Move' }));
  fireEvent.mouseDown(screen.getByTestId('scatter-chart'), {
    button: 0,
    clientX: 90,
    clientY: 40,
  });
  fireEvent.mouseMove(document, { clientX: 110, clientY: 50 });
  fireEvent.mouseUp(document, { button: 0, clientX: 110, clientY: 50 });
  const min = chart.options.scales?.x?.min;
  expect(min).not.toBe(1);
  fireEvent.click(screen.getByRole('button', { name: 'Clear points' }));
  expect(chart.data.datasets[0].data).toEqual([]);
  expect(chart.options.scales?.x?.min).toBe(min);
  act(() => y.send(3, 2));
  rerender(controller());
  expect(chart.data.datasets[0].data).toEqual([]);
  act(() => {
    x.send(6);
    y.send(4, 3);
  });
  rerender(controller());
  fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
  expect(chart.options.scales?.x?.min).toBe(1);
  expect(chart.data.datasets[0].data).toEqual([{ x: 6, y: 4 }]);
  unmount();
  expect(chart.destroy).toHaveBeenCalledTimes(1);
});
