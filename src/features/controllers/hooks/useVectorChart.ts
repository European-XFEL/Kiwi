import React from 'react';
import {
  init,
  use as registerEChartsModules,
  type EChartsType,
} from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { DisplayVectorGraphModel } from '@/karabo/common/api';
import {
  useTrendMouseGestures,
  type AxisRanges,
} from './useTrendMouseGestures';
import type { useVectorGraphView } from './useVectorGraphView';
import {
  fixedVectorRange,
  vectorChartOption,
  vectorPlotBounds,
  vectorSeriesOption,
} from './vectorChartConfig';

registerEChartsModules([
  LineChart,
  GridComponent,
  TitleComponent,
  CanvasRenderer,
]);

type VectorView = ReturnType<typeof useVectorGraphView>;
type AppliedConfig = {
  model: DisplayVectorGraphModel;
  x?: AxisRanges['x'];
  y?: AxisRanges['y'];
  resetRevision: number;
};

function sameRange(first?: AxisRanges['x'], second?: AxisRanges['x']) {
  return first?.[0] === second?.[0] && first?.[1] === second?.[1];
}

function renderedRanges(
  chart: EChartsType,
  title: string,
  fallback?: AxisRanges
) {
  const bounds = vectorPlotBounds(chart.getWidth(), chart.getHeight(), title);
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
  const xValues = [first?.[0], second?.[0]];
  const yValues = [first?.[1], second?.[1]];
  const x = valid(xValues)
    ? (xValues.sort((a, b) => a - b) as AxisRanges['x'])
    : fallback?.x;
  const y = valid(yValues)
    ? (yValues.sort((a, b) => a - b) as AxisRanges['y'])
    : fallback?.y;
  return x && y ? { x, y } : undefined;
}

export function useVectorChart({
  model,
  values,
  indices,
  view,
}: {
  model: DisplayVectorGraphModel;
  values: number[];
  indices: number[];
  view: VectorView;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const selectionRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<EChartsType | null>(null);
  const activeRef = React.useRef(false);
  const pendingUpdateRef = React.useRef<
    ((ranges?: AxisRanges) => void) | undefined
  >(undefined);
  const rangesRef = React.useRef<AxisRanges | undefined>(undefined);
  const appliedConfigRef = React.useRef<AppliedConfig | undefined>(undefined);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chart = init(container, undefined, {
      renderer: 'canvas',
      useDirtyRect: true,
    });
    appliedConfigRef.current = undefined;
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
      appliedConfigRef.current = undefined;
    };
  }, []);

  const applyLatest = React.useCallback(
    (gestureRanges?: AxisRanges) => {
      const chart = chartRef.current;
      if (!chart) return;
      const xRange =
        gestureRanges?.x ??
        view.ranges?.x ??
        fixedVectorRange(model.x_autorange, model.x_min, model.x_max);
      const yRange =
        gestureRanges?.y ??
        view.ranges?.y ??
        fixedVectorRange(model.y_autorange, model.y_min, model.y_max);
      const previous = appliedConfigRef.current;
      const configChanged =
        previous?.model !== model ||
        previous.resetRevision !== view.resetRevision ||
        !sameRange(previous.x, xRange) ||
        !sameRange(previous.y, yRange);
      const option = configChanged
        ? vectorChartOption(model, values, indices, xRange, yRange)
        : { series: [vectorSeriesOption(values, indices)] };
      chart.setOption(option, { replaceMerge: ['series'] });
      appliedConfigRef.current = {
        model,
        x: xRange,
        y: yRange,
        resetRevision: view.resetRevision,
      };
      rangesRef.current = renderedRanges(
        chart,
        model.title,
        xRange && yRange ? { x: xRange, y: yRange } : rangesRef.current
      );
      pendingUpdateRef.current = undefined;
    },
    [indices, model, values, view.ranges, view.resetRevision]
  );

  React.useLayoutEffect(() => {
    if (activeRef.current) {
      pendingUpdateRef.current = applyLatest;
      return;
    }
    applyLatest();
  }, [applyLatest, view.resetRevision]);

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
    logarithmicX: model.x_log,
    logarithmicY: model.y_log,
    activeRef,
    getRanges,
    setRanges,
    complete: view.pause,
    finish,
    reset: view.reset,
  });

  return { containerRef, selectionRef };
}
