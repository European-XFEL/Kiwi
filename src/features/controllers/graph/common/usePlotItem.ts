import React from 'react';
import { Chart } from 'chart.js/auto';
import type { ChartConfiguration, DefaultDataPoint } from 'chart.js';
import type { Range } from './constants';
import type { PlotViewport } from '../types';

/**
 * Owns the Chart.js canvas and instance lifecycle for every graph type.
 * Exposes chart bounds, ranges, data updates, and dataset visibility to callers.
 */
export function usePlotItem<
  T extends 'line' | 'scatter' | 'bar' = 'line',
  TData = DefaultDataPoint<T>,
>(
  configuration: () => ChartConfiguration<T, TData>,
  identity: readonly unknown[]
) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<Chart<T, TData> | null>(null);
  const [yAxisWidth, setYAxisWidth] = React.useState<number>();
  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const config = configuration();
    const yAxis = config.options!.scales!.y!;
    const afterFit = yAxis.afterFit;
    yAxis.afterFit = (scale) => {
      afterFit?.(scale);
      setYAxisWidth(scale.width);
    };
    const chart = new Chart(canvas, config);
    chartRef.current = chart;
    return () => {
      chart.destroy();
      canvas.remove();
      chartRef.current = null;
    };
    // Identity contains only values that require recreating the Chart.js instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, identity);

  const viewport = React.useMemo<PlotViewport>(
    () => ({
      readBounds: () => {
        const area = chartRef.current?.chartArea;
        return area
          ? {
              left: area.left,
              right: area.right,
              top: area.top,
              bottom: area.bottom,
            }
          : undefined;
      },
      readRanges: (fallback) => {
        const chart = chartRef.current;
        if (!chart) return fallback;
        const read = (key: 'x' | 'y'): Range | undefined => {
          const scale = chart.scales[key];
          const { min, max } = scale;
          return Number.isFinite(min) && Number.isFinite(max) && min !== max
            ? [min, max]
            : fallback?.[key];
        };
        const x = read('x');
        const y = read('y');
        return x && y ? { x, y } : undefined;
      },
      setRanges: (ranges) => {
        const chart = chartRef.current;
        if (!chart) return;
        chart.options!.scales!.x!.min = ranges.x[0];
        chart.options!.scales!.x!.max = ranges.x[1];
        chart.options!.scales!.y!.min = ranges.y[0];
        chart.options!.scales!.y!.max = ranges.y[1];
        chart.update('none');
      },
    }),
    []
  );

  const update = React.useCallback(
    (
      datasets: ChartConfiguration<T, TData>['data']['datasets'],
      xRange?: Range,
      yRange?: Range,
      pointRadius?: number
    ) => {
      const chart = chartRef.current;
      if (!chart) return;
      datasets.forEach((dataset, index) => {
        chart.data.datasets[index].data = dataset.data;
      });
      if (pointRadius !== undefined)
        Object.assign(chart.data.datasets[0], { pointRadius });
      chart.options!.scales!.x!.min = xRange?.[0];
      chart.options!.scales!.x!.max = xRange?.[1];
      chart.options!.scales!.y!.min = yRange?.[0];
      chart.options!.scales!.y!.max = yRange?.[1];
      chart.update('none');
    },
    []
  );
  const setVisible = React.useCallback((visibility: readonly boolean[]) => {
    const chart = chartRef.current;
    if (!chart) {
      return;
    }
    let changed = false;
    visibility.forEach((visible, index) => {
      if (chart.isDatasetVisible(index) !== visible) {
        chart.setDatasetVisibility(index, visible);
        changed = true;
      }
    });
    if (changed) {
      chart.update('none');
    }
  }, []);
  return { containerRef, viewport, update, setVisible, yAxisWidth };
}
