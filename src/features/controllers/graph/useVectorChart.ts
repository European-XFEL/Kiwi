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
import { isTypedArray } from '@/karabo/data/api';
import type { HashType } from '@/karabo/data/typenums';
import { PropertyProxy, ProxyStatus } from '@/lib/binding/api';
import type { GraphMouseTool } from '@/features/controllers/graph/GraphToolbar';
import { useIdleScheduler } from '../useIdleScheduler';
import { lttb } from '../utils/lttb';
import {
  useTrendMouseGestures,
  type AxisRanges,
} from './useTrendMouseGestures';
import {
  fixedVectorRange,
  chooseVectorTargetPoints,
  visibleVectorRange,
  vectorChartOption,
  vectorPlotBounds,
  vectorSeriesOption,
} from './configVectorChart';

registerEChartsModules([
  LineChart,
  GridComponent,
  TitleComponent,
  CanvasRenderer,
]);

export type VectorData = ArrayLike<number>;

type AppliedConfig = {
  model: DisplayVectorGraphModel;
  x?: AxisRanges['x'];
  y?: AxisRanges['y'];
  resetRevision: number;
};

function normalizeVector(raw: unknown): VectorData {
  if (!raw) return new Float64Array();

  if (isTypedArray(raw)) {
    if (!(raw instanceof BigInt64Array) && !(raw instanceof BigUint64Array))
      return raw;
  } else if (!Array.isArray(raw)) {
    return new Float64Array();
  }

  const normalized = new Float64Array(raw.length);
  for (let index = 0; index < raw.length; index++) {
    normalized[index] = Number(raw[index]);
  }
  return normalized;
}

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
  proxy,
}: {
  model: DisplayVectorGraphModel;
  proxy: PropertyProxy | undefined;
}) {
  const isOffline =
    (proxy?.root.status ?? ProxyStatus.OFFLINE) === ProxyStatus.OFFLINE;
  const schemaValueType: HashType | undefined = proxy?.binding?.hashType;
  const rawValue = proxy?.value;
  const latestValue = React.useRef(rawValue);
  latestValue.current = rawValue;
  const schedulePublish = useIdleScheduler(1000);
  const [{ values, rawLength }, setPublished] = React.useState(() => ({
    values: new Float64Array() as VectorData,
    rawLength: 0,
  }));
  const [tool, setTool] = React.useState<GraphMouseTool>('pointer');
  const [ranges, setRangesState] = React.useState<AxisRanges>();
  const [resetRevision, setResetRevision] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const selectionRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<EChartsType | null>(null);
  const activeRef = React.useRef(false);
  const pendingUpdateRef = React.useRef<
    ((ranges?: AxisRanges) => void) | undefined
  >(undefined);
  const rangesRef = React.useRef<AxisRanges | undefined>(undefined);
  const appliedConfigRef = React.useRef<AppliedConfig | undefined>(undefined);

  React.useEffect(() => {
    if (isOffline) return;
    schedulePublish(() => {
      const nextValues = normalizeVector(latestValue.current);
      setPublished({ values: nextValues, rawLength: nextValues.length });
    });
  }, [isOffline, rawValue, schedulePublish]);

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
        ranges?.x ??
        fixedVectorRange(model.x_autorange, model.x_min, model.x_max);
      const yRange =
        gestureRanges?.y ??
        ranges?.y ??
        fixedVectorRange(model.y_autorange, model.y_min, model.y_max);
      const previous = appliedConfigRef.current;
      const configChanged =
        previous?.model !== model ||
        previous.resetRevision !== resetRevision ||
        !sameRange(previous.x, xRange) ||
        !sameRange(previous.y, yRange);
      const [start, end] = visibleVectorRange(
        values.length,
        xRange,
        model.x_log
      );
      const visiblePoints = lttb(
        values,
        chooseVectorTargetPoints(end - start),
        start,
        end
      );
      const option = configChanged
        ? vectorChartOption(model, visiblePoints, xRange, yRange)
        : { series: [vectorSeriesOption(visiblePoints)] };
      chart.setOption(option, { replaceMerge: ['series'] });
      appliedConfigRef.current = {
        model,
        x: xRange,
        y: yRange,
        resetRevision,
      };
      rangesRef.current = renderedRanges(
        chart,
        model.title,
        xRange && yRange ? { x: xRange, y: yRange } : rangesRef.current
      );
      pendingUpdateRef.current = undefined;
    },
    [model, values, ranges, resetRevision]
  );

  React.useLayoutEffect(() => {
    if (activeRef.current) {
      pendingUpdateRef.current = applyLatest;
      return;
    }
    applyLatest();
  }, [applyLatest, resetRevision]);

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
  const selectTool = React.useCallback(
    (next: GraphMouseTool) =>
      setTool((current) => (current === next ? 'pointer' : next)),
    []
  );
  const pause = React.useCallback(
    (x: AxisRanges['x'], y: AxisRanges['y']) => setRangesState({ x, y }),
    []
  );
  const reset = React.useCallback(() => {
    setRangesState(undefined);
    setResetRevision((current) => current + 1);
  }, []);

  useTrendMouseGestures({
    containerRef,
    selectionRef,
    chartRef,
    tool,
    inverted: { x: model.x_invert, y: model.y_invert },
    logarithmicX: model.x_log,
    logarithmicY: model.y_log,
    activeRef,
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
    reset,
    values,
    rawLength,
    schemaValueType,
  };
}
