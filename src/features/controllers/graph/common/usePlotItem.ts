import React from 'react';
import { Chart } from 'chart.js/auto';
import type { ChartConfiguration } from 'chart.js';
import type { Range } from './constants';
import type { AxisRanges, PlotBounds } from './useMouseGestures';

export type PlotViewport = {
  readBounds: () => PlotBounds | undefined;
  readRanges: (fallback?: AxisRanges) => AxisRanges | undefined;
  setRanges: (ranges: AxisRanges) => void;
};

/**
 * Owns the Chart.js canvas and instance lifecycle for every graph type.
 * Exposes chart bounds, ranges, data updates, and dataset visibility to callers.
 */
export function usePlotItem<T extends 'line' | 'scatter' = 'line'>(
  configuration: () => ChartConfiguration<T>,
  identity: readonly unknown[]
) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<Chart<T> | null>(null);
  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const chart = new Chart(canvas, configuration());
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
      datasets: ChartConfiguration<T>['data']['datasets'],
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
        chart.data.datasets[0].pointRadius = pointRadius;
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
  return { containerRef, viewport, update, setVisible };
}
