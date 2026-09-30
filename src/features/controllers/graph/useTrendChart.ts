import React from 'react';
import { Chart } from 'chart.js/auto';
import type { DisplayTrendGraphModel } from '@/karabo/common/api';
import type { TrendSeries } from './useTrendModel';
import {
  fixedXRange,
  fixedYRange,
  trendDatasets,
  trendChartOption,
  type Range,
} from './configTrendChart';
import {
  useTrendMouseGestures,
  type AxisRanges,
} from './useTrendMouseGestures';

type TimeRangeMode = 'uptime' | 'week' | 'day' | 'hour' | 'tenMinutes';
type View = {
  mode: TimeRangeMode | null;
  xRange?: Range;
  yRange?: Range;
};

function renderedRanges(
  chart: Chart<'line'>,
  fallback?: AxisRanges
): AxisRanges | undefined {
  const range = (key: 'x' | 'y') => {
    const { min, max } = chart.scales[key];
    return Number.isFinite(min) && Number.isFinite(max) && min !== max
      ? ([min!, max!] as Range)
      : fallback?.[key];
  };
  const x = range('x');
  const y = range('y');
  return x && y ? { x, y } : undefined;
}

export function useTrendChart({
  model,
  series,
  startTime,
  dataRevision,
}: {
  model: DisplayTrendGraphModel;
  series: TrendSeries[];
  startTime: number;
  dataRevision: number;
}) {
  const [tool, setTool] = React.useState<'pointer' | 'zoom' | 'pan'>('pointer');
  const [view, setView] = React.useState<View>({ mode: 'uptime' });
  const [visibleRange, setVisibleRange] = React.useState<Range>();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const selectionRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<Chart<'line'> | null>(null);
  const latestSeriesRef = React.useRef(series);
  latestSeriesRef.current = series;
  const [hiddenCurves, setHiddenCurves] = React.useState<Set<string>>(
    () => new Set()
  );
  const gestureActiveRef = React.useRef(false);
  const pendingUpdateRef = React.useRef<
    ((ranges?: AxisRanges) => void) | undefined
  >(undefined);
  const rangesRef = React.useRef<AxisRanges | undefined>(undefined);

  const xRange = React.useMemo<Range | undefined>(() => {
    if (view.mode === null) return view.xRange;
    const latest = Math.max(
      startTime,
      ...series.map((item) => item.timestamps.at(-1) ?? startTime)
    );
    if (view.mode === 'uptime') {
      return [startTime, Math.max(startTime + 1000, latest)];
    }
    const end = Date.now();
    const start = new Date(end);
    if (view.mode === 'day' || view.mode === 'week') {
      start.setDate(start.getDate() - (view.mode === 'week' ? 7 : 1));
    } else {
      start.setTime(end - (view.mode === 'hour' ? 3600 : 600) * 1000);
    }
    return [start.getTime(), end];
  }, [view, startTime, series]);

  const rememberRange = React.useCallback((range: Range) => {
    const values = [...range].sort((a, b) => a - b) as Range;
    setVisibleRange((current) =>
      current?.[0] === values[0] && current?.[1] === values[1]
        ? current
        : values
    );
  }, []);
  const follow = React.useCallback((mode: TimeRangeMode) => {
    setView((current) => ({ ...current, mode }));
  }, []);
  const pause = React.useCallback(
    (nextXRange: Range, nextYRange?: Range) => {
      rememberRange(nextXRange);
      setView((current) => ({
        ...current,
        mode: null,
        xRange: nextXRange,
        yRange: nextYRange ?? current.yRange,
      }));
    },
    [rememberRange]
  );
  const reset = React.useCallback(() => setView({ mode: 'uptime' }), []);
  const selectTool = React.useCallback(
    (next: 'pointer' | 'zoom' | 'pan') =>
      setTool((current) => (current === next ? 'pointer' : next)),
    []
  );

  const seriesKeys = series.map((item) => item.key).join('\0');
  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const chart = new Chart(
      canvas,
      trendChartOption(model, latestSeriesRef.current)
    );
    chartRef.current = chart;
    return () => {
      chart.destroy();
      canvas.remove();
      chartRef.current = null;
    };
  }, [model, seriesKeys]);

  React.useLayoutEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    let visibilityChanged = false;
    seriesKeys
      .split('\0')
      .filter(Boolean)
      .forEach((key, index) => {
        const visible = !hiddenCurves.has(key);
        if (chart.isDatasetVisible(index) !== visible) {
          chart.setDatasetVisibility(index, visible);
          visibilityChanged = true;
        }
      });
    if (visibilityChanged) chart.update('none');
    rangesRef.current = renderedRanges(chart, rangesRef.current);
  }, [seriesKeys, hiddenCurves]);
  const toggleCurve = React.useCallback((key: string) => {
    const chart = chartRef.current;
    const index = chart?.data.datasets.findIndex(
      (dataset) => dataset.label === key
    );
    if (!chart || index === undefined || index < 0) return;
    const visible = !chart.isDatasetVisible(index);
    chart.setDatasetVisibility(index, visible);
    chart.update('none');
    setHiddenCurves((current) => {
      const next = new Set(current);
      if (visible) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const yRange = view.yRange;
  const applyLatest = React.useCallback(
    (gestureRanges?: AxisRanges) => {
      const chart = chartRef.current;
      if (!chart) return;
      const nextX = gestureRanges?.x ?? xRange ?? fixedXRange(model);
      const nextY = gestureRanges?.y ?? yRange ?? fixedYRange(model);
      const datasets = trendDatasets(series);
      datasets.forEach((dataset, index) => {
        chart.data.datasets[index].data = dataset.data;
      });
      chart.options.scales!.x!.min = nextX?.[0];
      chart.options.scales!.x!.max = nextX?.[1];
      chart.options.scales!.y!.min = nextY?.[0];
      chart.options.scales!.y!.max = nextY?.[1];
      chart.update('none');
      const fallback: AxisRanges | undefined = nextX
        ? { x: nextX, y: nextY ?? rangesRef.current?.y ?? [0, 1] }
        : rangesRef.current;
      const ranges = renderedRanges(chart, fallback);
      rangesRef.current = ranges;
      if (ranges) rememberRange(ranges.x);
      pendingUpdateRef.current = undefined;
    },
    [model, rememberRange, series, xRange, yRange]
  );

  React.useLayoutEffect(() => {
    if (gestureActiveRef.current) {
      // Replace the pending work so finishing a drag applies the latest samples.
      pendingUpdateRef.current = applyLatest;
      return;
    }
    applyLatest();
  }, [applyLatest, dataRevision]);

  const getRanges = React.useCallback(() => rangesRef.current, []);
  const setRanges = React.useCallback((ranges: AxisRanges) => {
    rangesRef.current = ranges;
    const chart = chartRef.current;
    if (!chart) return;
    chart.options.scales!.x!.min = ranges.x[0];
    chart.options.scales!.x!.max = ranges.x[1];
    chart.options.scales!.y!.min = ranges.y[0];
    chart.options.scales!.y!.max = ranges.y[1];
    chart.update('none');
  }, []);
  const finish = React.useCallback(() => {
    pendingUpdateRef.current?.(rangesRef.current);
  }, []);

  useTrendMouseGestures({
    containerRef,
    selectionRef,
    chartRef,
    tool,
    inverted: { x: model.x_invert, y: model.y_invert },
    logarithmicY: model.y_log,
    activeRef: gestureActiveRef,
    getRanges,
    setRanges,
    complete: pause,
    finish,
    reset,
  });

  return {
    containerRef,
    selectionRef,
    tool,
    selectTool,
    mode: view.mode,
    visibleRange,
    follow,
    reset,
    xRange,
    yRange,
    pause,
    rememberRange,
    hiddenCurves,
    toggleCurve,
  };
}
