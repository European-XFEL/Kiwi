import { buildModelConfig } from '../common/api';
import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { Chart } from 'chart.js/auto';
import {
  DisplayVectorGraphModel,
  VectorBarGraphModel,
} from '@/karabo/common/api';
import type { PropertyProxy } from '@/lib/binding/PropertyProxy';
import { useVectorChart } from '../useVectorChart';
import { useVectorBarChart } from '../useVectorBarChart';
import { makeVectorProxy } from '../testing/vectorProxy';

function VectorChartHarness({
  model,
  proxy,
}: {
  model: DisplayVectorGraphModel | VectorBarGraphModel;
  proxy?: PropertyProxy;
}) {
  return model instanceof VectorBarGraphModel ? (
    <ChartHarness model={model} proxy={proxy} useGraph={useVectorBarChart} />
  ) : (
    <ChartHarness model={model} proxy={proxy} useGraph={useVectorChart} />
  );
}

function ChartHarness({
  model,
  proxy,
  useGraph,
}: {
  model: DisplayVectorGraphModel | VectorBarGraphModel;
  proxy?: PropertyProxy;
  useGraph: typeof useVectorChart;
}) {
  const plotConfig = React.useMemo(() => buildModelConfig(model), [model]);
  const { containerRef, selectTool } = useGraph({
    plotConfig,
    proxy,
  });
  return (
    <>
      <div ref={containerRef} data-testid="vector-chart" />
      <button onClick={() => selectTool('pan')}>Move</button>
    </>
  );
}

type MockChart = Chart<'line'> & { update: jest.Mock; destroy: jest.Mock };
const charts = () => (Chart as unknown as { instances: MockChart[] }).instances;
const chart = () => charts().at(-1)!;

describe('vector line and bar hooks with Chart.js', () => {
  beforeEach(() => {
    charts().length = 0;
  });

  it('creates and disposes charts in strict mode', () => {
    const model = new DisplayVectorGraphModel();
    model.x_label = 'Position';
    model.y_label = 'Intensity';
    const { unmount } = render(
      <React.StrictMode>
        <VectorChartHarness model={model} />
      </React.StrictMode>
    );
    expect(charts().length).toBeGreaterThan(1);
    expect(chart().options.scales).toMatchObject({
      x: { title: { text: 'Position' } },
      y: { title: { text: 'Intensity' } },
    });
    unmount();
    expect(chart().destroy).toHaveBeenCalled();
  });

  it('updates the displayed range while panning', () => {
    render(<VectorChartHarness model={new DisplayVectorGraphModel()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    const container = screen.getByTestId('vector-chart');
    fireEvent.mouseDown(container, { button: 0, clientX: 90, clientY: 40 });
    fireEvent.mouseUp(document, { button: 0, clientX: 100, clientY: 50 });
    expect(chart().update).toHaveBeenCalled();
    expect(chart().options.scales?.x).toMatchObject({
      min: expect.any(Number),
      max: expect.any(Number),
    });
  });

  it.each([
    { name: 'bar', model: new VectorBarGraphModel() },
    { name: 'vector line', model: new DisplayVectorGraphModel() },
  ])('handles the first right-button drag for $name', ({ model }) => {
    render(<VectorChartHarness model={model} />);
    const container = screen.getByTestId('vector-chart');
    fireEvent.mouseDown(container, { button: 2, clientX: 90, clientY: 40 });
    fireEvent.mouseMove(document, {
      button: 2,
      clientX: 120,
      clientY: 40,
    });
    fireEvent.mouseUp(document, { button: 2, clientX: 120, clientY: 40 });
    expect(chart().options.scales?.x?.min).toEqual(expect.any(Number));
  });

  it('navigates the recreated chart with the existing mouse listeners', () => {
    const view = render(
      <VectorChartHarness model={new DisplayVectorGraphModel()} />
    );
    const first = chart();
    view.rerender(<VectorChartHarness model={new DisplayVectorGraphModel()} />);
    expect(first.destroy).toHaveBeenCalled();
    const container = screen.getByTestId('vector-chart');
    fireEvent.mouseDown(container, { button: 2, clientX: 90, clientY: 40 });
    fireEvent.mouseUp(document, { button: 2, clientX: 120, clientY: 40 });
    expect(chart().options.scales?.x?.min).toEqual(expect.any(Number));
  });

  it.each([-2, 0, 2])(
    'plots line coordinates with step %s without recreating the chart on data updates',
    (step) => {
      const originalRequest = window.requestIdleCallback;
      const originalCancel = window.cancelIdleCallback;
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
      const proxy = makeVectorProxy([1, 2, 3]);
      const model = new DisplayVectorGraphModel();
      model.offset = 10;
      model.step = step;
      const view = render(<VectorChartHarness model={model} proxy={proxy} />);
      try {
        act(() => jest.runOnlyPendingTimers());
        const currentChart = chart();
        expect(currentChart.data.datasets[0].data).toEqual([
          { x: 10, y: 1 },
          { x: 10 + (step || 1), y: 2 },
          { x: 10 + 2 * (step || 1), y: 3 },
        ]);
        proxy.binding!.setValue([4, 5], undefined);
        view.rerender(<VectorChartHarness model={model} proxy={proxy} />);
        act(() => jest.runOnlyPendingTimers());
        expect(chart()).toBe(currentChart);
        expect(chart().data.datasets[0].data).toEqual([
          { x: 10, y: 4 },
          { x: 10 + (step || 1), y: 5 },
        ]);
      } finally {
        view.unmount();
        window.requestIdleCallback = originalRequest;
        window.cancelIdleCallback = originalCancel;
        jest.useRealTimers();
      }
    }
  );

  it.each([
    { name: 'varying', constant: false, viewport: false, expected: 30_000 },
    { name: 'constant', constant: true, viewport: false, expected: 30_000 },
    { name: 'viewport', constant: false, viewport: true, expected: 20_000 },
  ])(
    'samples large $name vector lines and clears them',
    ({ constant, viewport, expected }) => {
      const originalRequest = window.requestIdleCallback;
      const originalCancel = window.cancelIdleCallback;
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
      const proxy = makeVectorProxy(
        Float64Array.from({ length: 200_001 }, (_, i) => (constant ? 1 : i))
      );
      const model = new DisplayVectorGraphModel();
      model.offset = 10;
      model.step = 2;
      if (viewport) {
        model.x_autorange = false;
        model.x_min = 100_010;
        model.x_max = 120_010;
      }
      const view = render(<VectorChartHarness model={model} proxy={proxy} />);
      try {
        act(() => jest.runOnlyPendingTimers());
        const points = chart().data.datasets[0].data as {
          x: number;
          y: number;
        }[];
        expect(points).toHaveLength(expected);
        const first = viewport ? 40_000 : 0;
        const last = viewport ? 70_000 : 200_000;
        expect(points[0]).toEqual({
          x: 10 + first * 2,
          y: constant ? 1 : first,
        });
        expect(points.at(-1)).toEqual({
          x: 10 + last * 2,
          y: constant ? 1 : last,
        });
        proxy.binding!.setValue([], undefined);
        view.rerender(<VectorChartHarness model={model} proxy={proxy} />);
        act(() => jest.runOnlyPendingTimers());
        expect(chart().data.datasets[0].data).toEqual([]);
      } finally {
        view.unmount();
        window.requestIdleCallback = originalRequest;
        window.cancelIdleCallback = originalCancel;
        jest.useRealTimers();
      }
    }
  );

  it('samples bars for the padded viewport while preserving the full source', async () => {
    const values = Float64Array.from({ length: 1000 }, (_, index) => -index);
    const proxy = makeVectorProxy(values);
    const model = new VectorBarGraphModel();
    Object.assign(model, {
      x_autorange: false,
      x_min: 100,
      x_max: 120,
      x_log: true,
    });
    const view = render(<VectorChartHarness model={model} proxy={proxy} />);
    await waitFor(() => expect(chart().data.datasets[0].data).toHaveLength(61));
    const data = chart().data.datasets[0].data;
    expect(data).toHaveLength(61);
    expect(data[0]).toEqual({ x: 80, y: -80 });
    expect(data.at(-1)).toEqual({ x: 140, y: -140 });
    expect(chart().options.scales?.x).toMatchObject({
      type: 'linear',
      min: 100,
      max: 120,
    });
    const outside = new VectorBarGraphModel();
    Object.assign(outside, { x_autorange: false, x_min: 2000, x_max: 2100 });
    view.rerender(<VectorChartHarness model={outside} proxy={proxy} />);
    expect(chart().data.datasets[0].data).toEqual([]);
    expect(proxy.binding!.getValue()).toBe(values);
    expect(values).toHaveLength(1000);
  });

  it.each([
    { name: 'varying', valueAt: (index: number) => index },
    { name: 'constant', valueAt: () => 1 },
  ])(
    'publishes at most 3000 indexed $name bars and clears stale values',
    ({ valueAt }) => {
      const originalRequest = window.requestIdleCallback;
      const originalCancel = window.cancelIdleCallback;
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
      const proxy = makeVectorProxy(
        Array.from({ length: 4000 }, (_, index) => valueAt(index))
      );
      const model = new VectorBarGraphModel();
      const view = render(<VectorChartHarness model={model} proxy={proxy} />);
      try {
        act(() => jest.runOnlyPendingTimers());
        const points = chart().data.datasets[0].data as {
          x: number;
          y: number;
        }[];
        expect(points).toHaveLength(3000);
        expect(points[0]).toEqual({ x: 0, y: valueAt(0) });
        expect(points.at(-1)).toEqual({ x: 3999, y: valueAt(3999) });
        fireEvent.click(screen.getByRole('button', { name: 'Move' }));
        fireEvent.mouseDown(screen.getByTestId('vector-chart'), {
          button: 0,
          clientX: 90,
          clientY: 40,
        });
        proxy.binding!.setValue([-1, 9], undefined);
        view.rerender(<VectorChartHarness model={model} proxy={proxy} />);
        act(() => jest.runOnlyPendingTimers());
        expect(chart().data.datasets[0].data).toHaveLength(3000);
        fireEvent.mouseUp(document, { button: 0, clientX: 100, clientY: 50 });
        expect(chart().data.datasets[0].data).toEqual([
          { x: 0, y: -1 },
          { x: 1, y: 9 },
        ]);
        proxy.binding!.setValue([], undefined);
        view.rerender(<VectorChartHarness model={model} proxy={proxy} />);
        act(() => jest.runOnlyPendingTimers());
        expect(chart().data.datasets[0].data).toEqual([]);
      } finally {
        view.unmount();
        expect(chart().destroy).toHaveBeenCalled();
        window.requestIdleCallback = originalRequest;
        window.cancelIdleCallback = originalCancel;
        jest.useRealTimers();
      }
    }
  );
});
