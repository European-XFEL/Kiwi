import React from 'react';
import { render, screen } from '@testing-library/react';
import { Chart } from 'chart.js/auto';
import type { ChartConfiguration, LineElement } from 'chart.js';
import { VectorXYGraphModel } from '@/karabo/common/api';
import { buildModelConfig } from '../common/api';
import { useVectorChart } from '../useVectorChart';

jest.mock('chart.js/auto', () => {
  const actual = jest.requireActual<typeof import('chart.js')>('chart.js');
  actual.Chart.register(...actual.registerables);
  return {
    Chart: class extends actual.Chart {
      constructor(canvas: HTMLCanvasElement, config: ChartConfiguration) {
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
        super(canvas, {
          ...config,
          options: { ...config.options, responsive: false },
          platform: actual.BasicPlatform,
        });
      }
    },
  };
});

function Harness({
  model,
  x,
  y,
}: {
  model: VectorXYGraphModel;
  x: Float64Array;
  y: Float64Array;
}) {
  const plotConfig = React.useMemo(() => buildModelConfig(model), [model]);
  const plotWindow = useVectorChart({
    plotConfig,
    xValues: x,
    ySeries: [{ key: 'y', values: y }],
  });
  return <div ref={plotWindow.containerRef} data-testid="plot" />;
}

test.each([false, true])(
  'real Chart.js keeps crossing segments during live zoomed updates (descending=%s)',
  (descending) => {
    const model = new VectorXYGraphModel();
    model.x_autorange = false;
    model.x_min = 50.2;
    model.x_max = 50.8;
    model.y_autorange = false;
    model.y_min = -10;
    model.y_max = 10;
    const coordinates = (shift: number) =>
      Float64Array.from(
        { length: 201 },
        (_, i) => (descending ? 200 - i : i) + shift
      );
    const values = (y: number) => new Float64Array(201).fill(y);
    const view = render(
      <Harness model={model} x={coordinates(0)} y={values(1)} />
    );
    const canvas = screen.getByTestId('plot').querySelector('canvas')!;
    const chart = Chart.getChart(canvas)!;
    for (const shift of [0, 0.5, 0.1, 0]) {
      view.rerender(
        <Harness model={model} x={coordinates(shift)} y={values(1 + shift)} />
      );
      expect(Chart.getChart(canvas)).toBe(chart);
      const line = chart.getDatasetMeta(0).dataset as LineElement;
      expect(line.segments).toHaveLength(1);
      const { start, end } = line.segments[0];
      const points = chart.getDatasetMeta(0).data;
      const pixels = [points[start].x, points[end].x];
      expect(Math.min(...pixels)).toBeLessThanOrEqual(chart.chartArea.left);
      expect(Math.max(...pixels)).toBeGreaterThanOrEqual(chart.chartArea.right);
      expect(chart.scales.x.min).toBe(50.2);
      expect(chart.scales.x.max).toBe(50.8);
    }
    view.rerender(
      <Harness model={model} x={new Float64Array()} y={values(1)} />
    );
    expect(chart.getDatasetMeta(0).data).toHaveLength(0);
    view.unmount();
    expect(Chart.getChart(canvas)).toBeUndefined();
  }
);

test.each([
  { xLog: false, yLog: false },
  { xLog: true, yLog: false },
  { xLog: false, yLog: true },
  { xLog: true, yLog: true },
])(
  'real Chart.js supports x_log=$xLog and y_log=$yLog during live viewport updates',
  ({ xLog, yLog }) => {
    const model = new VectorXYGraphModel();
    model.x_log = xLog;
    model.y_log = yLog;
    model.x_autorange = false;
    model.x_min = 50.2;
    model.x_max = 51.8;
    model.y_autorange = false;
    model.y_min = 1;
    model.y_max = 100;
    const x = Float64Array.from({ length: 201 }, (_, i) => i + 1);
    const view = render(
      <Harness model={model} x={x} y={new Float64Array(201).fill(10)} />
    );
    const canvas = screen.getByTestId('plot').querySelector('canvas')!;
    const chart = Chart.getChart(canvas)!;
    expect(chart.scales.x.type).toBe(xLog ? 'logarithmic' : 'linear');
    expect(chart.scales.y.type).toBe(yLog ? 'logarithmic' : 'linear');
    for (const value of [10, 20, 30]) {
      view.rerender(
        <Harness model={model} x={x} y={new Float64Array(201).fill(value)} />
      );
      const meta = chart.getDatasetMeta(0);
      const line = meta.dataset as LineElement;
      expect(line.segments).toHaveLength(1);
      const { start, end } = line.segments[0];
      expect(meta.data[start].x).toBeLessThanOrEqual(chart.chartArea.left);
      expect(meta.data[end].x).toBeGreaterThanOrEqual(chart.chartArea.right);
      expect(meta.data[start].y).toBeCloseTo(
        chart.scales.y.getPixelForValue(value)
      );
      expect(Chart.getChart(canvas)).toBe(chart);
      expect(chart.scales.x.min).toBe(50.2);
      expect(chart.scales.x.max).toBe(51.8);
      expect(chart.scales.y.min).toBe(1);
      expect(chart.scales.y.max).toBe(100);
    }
  }
);
