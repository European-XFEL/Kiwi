import React from 'react';
import {
  init,
  use as registerEChartsModules,
  type EChartsType,
} from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { DisplayTrendGraphModel } from '@/karabo/common/api';
import type { TrendSeries } from './useDisplayTrendGraph';
import { useTrendGraphView } from './useTrendGraphView';
import {
  fixedXRange,
  fixedYRange,
  trendChartOption,
  trendPlotBounds,
  type Range,
} from './trendChartConfig';
import {
  useTrendMouseGestures,
  type AxisRanges,
} from './useTrendMouseGestures';

registerEChartsModules([
  LineChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  CanvasRenderer,
]);

type TrendView = ReturnType<typeof useTrendGraphView>;

/**
 * Reads the displayed axis limits by converting the plot corners to data values.
 * ECharts chooses and rounds autorange limits, so gestures must use these rendered
 * limits to translate mouse movement correctly. The rendered X range also feeds
 * the time controls. If a collapsed plot cannot provide usable
 * limits, retain the supplied fallback ranges until the plot can be read again.
 */
function renderedRanges(
  chart: EChartsType,
  title: string,
  fallback?: AxisRanges
): AxisRanges | undefined {
  const bounds = trendPlotBounds(chart.getWidth(), chart.getHeight(), title);
  const first = chart.convertFromPixel({ gridIndex: 0 }, [
    bounds.left,
    bounds.bottom,
  ]) as number[];
  const second = chart.convertFromPixel({ gridIndex: 0 }, [
    bounds.right,
    bounds.top,
  ]) as number[];
  const valid = (values: number[]) =>
    values.every(Number.isFinite) && values[0] !== values[1];
  // A grid collapsed to zero width or height converts both edges to one value.
  // Keep usable ranges so resizing can restore gestures without another sample.
  const xValues = [first?.[0], second?.[0]];
  const yValues = [first?.[1], second?.[1]];
  const x = valid(xValues)
    ? (xValues.sort((a, b) => a - b) as Range)
    : fallback?.x;
  const y = valid(yValues)
    ? (yValues.sort((a, b) => a - b) as Range)
    : fallback?.y;
  return x && y ? { x, y } : undefined;
}

export function useTrendChart({
  model,
  series,
  dataRevision,
  view,
}: {
  model: DisplayTrendGraphModel;
  series: TrendSeries[];
  dataRevision: number;
  view: TrendView;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const selectionRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<EChartsType | null>(null);
  const gestureActiveRef = React.useRef(false);
  const pendingUpdateRef = React.useRef<
    ((ranges?: AxisRanges) => void) | undefined
  >(undefined);
  const rangesRef = React.useRef<AxisRanges | undefined>(undefined);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chart = init(container, undefined, {
      renderer: 'canvas',
      useDirtyRect: true,
    });
    const observer = new ResizeObserver(() => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (
        width === 0 ||
        height === 0 ||
        (chart.getWidth() === width && chart.getHeight() === height)
      )
        return;
      chart.resize({ width, height, silent: true });
    });
    chartRef.current = chart;
    observer.observe(container);
    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  const { rememberRange, pause, reset, xRange, yRange } = view;
  const applyLatest = React.useCallback(
    (gestureRanges?: AxisRanges) => {
      const chart = chartRef.current;
      if (!chart) return;
      const nextX = gestureRanges?.x ?? xRange ?? fixedXRange(model);
      const nextY = gestureRanges?.y ?? yRange ?? fixedYRange(model);
      const option = trendChartOption(model, series, nextX, nextY);
      chart.setOption(option, {
        // Preserve the grid and axes so switching ranges does not blank or
        // rebuild the plot. Series replacement still removes stale curves.
        replaceMerge: ['series'],
      });
      const fallback: AxisRanges | undefined =
        nextX && nextY ? { x: nextX, y: nextY } : rangesRef.current;
      const ranges = renderedRanges(chart, model.title, fallback);
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
    chartRef.current?.setOption({
      xAxis: { min: ranges.x[0], max: ranges.x[1] },
      yAxis: { min: ranges.y[0], max: ranges.y[1] },
    });
  }, []);
  const finish = React.useCallback(() => {
    pendingUpdateRef.current?.(rangesRef.current);
  }, []);

  useTrendMouseGestures({
    containerRef,
    selectionRef,
    chartRef,
    tool: view.tool,
    inverted: { x: model.x_invert, y: model.y_invert },
    logarithmicY: model.y_log,
    activeRef: gestureActiveRef,
    getRanges,
    setRanges,
    complete: pause,
    finish,
    reset,
  });

  return { containerRef, selectionRef };
}
