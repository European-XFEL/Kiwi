import { buildModelConfig } from '../common/api';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Chart } from 'chart.js/auto';
import {
  DisplayVectorGraphModel,
  VectorBarGraphModel,
} from '@/karabo/common/api';
import type { PropertyProxy } from '@/lib/binding/PropertyProxy';
import { ProxyStatus } from '@/lib/binding/api';
import { useVectorChart } from '../useVectorChart';

function VectorChartHarness({
  model,
  proxy,
}: {
  model: DisplayVectorGraphModel | VectorBarGraphModel;
  proxy?: PropertyProxy;
}) {
  const plotConfig = React.useMemo(() => buildModelConfig(model), [model]);
  const { containerRef, selectTool } = useVectorChart({
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

describe('useVectorChart with Chart.js', () => {
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

  it('plots transformed line coordinates without recreating the chart on data updates', () => {
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
    const proxy = {
      root: { status: ProxyStatus.MONITORING },
      value: [1, 2, 3],
    } as PropertyProxy;
    const model = new DisplayVectorGraphModel();
    model.offset = 10;
    model.step = -2;
    const view = render(<VectorChartHarness model={model} proxy={proxy} />);
    try {
      act(() => jest.runOnlyPendingTimers());
      const currentChart = chart();
      expect(currentChart.data.datasets[0].data).toEqual([
        { x: 10, y: 1 },
        { x: 8, y: 2 },
        { x: 6, y: 3 },
      ]);
      Object.assign(proxy, { value: [4, 5] });
      view.rerender(<VectorChartHarness model={model} proxy={proxy} />);
      act(() => jest.runOnlyPendingTimers());
      expect(chart()).toBe(currentChart);
      expect(chart().data.datasets[0].data).toEqual([
        { x: 10, y: 4 },
        { x: 8, y: 5 },
      ]);
    } finally {
      view.unmount();
      window.requestIdleCallback = originalRequest;
      window.cancelIdleCallback = originalCancel;
      jest.useRealTimers();
    }
  });

  it('publishes at most 3000 indexed bars and clears stale values', () => {
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
    const proxy = {
      root: { status: ProxyStatus.MONITORING },
      value: Array.from({ length: 4000 }, (_, index) => index),
    } as PropertyProxy;
    const model = new VectorBarGraphModel();
    const view = render(<VectorChartHarness model={model} proxy={proxy} />);
    try {
      act(() => jest.runOnlyPendingTimers());
      const points = chart().data.datasets[0].data as {
        x: number;
        y: number;
      }[];
      expect(points).toHaveLength(3000);
      expect(points[0]).toEqual({ x: 0, y: 0 });
      expect(points.at(-1)).toEqual({ x: 3999, y: 3999 });
      fireEvent.click(screen.getByRole('button', { name: 'Move' }));
      fireEvent.mouseDown(screen.getByTestId('vector-chart'), {
        button: 0,
        clientX: 90,
        clientY: 40,
      });
      Object.assign(proxy, { value: [-1, 9] });
      view.rerender(<VectorChartHarness model={model} proxy={proxy} />);
      act(() => jest.runOnlyPendingTimers());
      expect(chart().data.datasets[0].data).toHaveLength(3000);
      fireEvent.mouseUp(document, { button: 0, clientX: 100, clientY: 50 });
      expect(chart().data.datasets[0].data).toEqual([
        { x: 0, y: -1 },
        { x: 1, y: 9 },
      ]);
      Object.assign(proxy, { value: [] });
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
  });
});
