import React from 'react';
import { Chart } from 'chart.js/auto';
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
  vectorPoints,
} from './configVectorChart';
import { GRAPH_LAYOUT } from './configTrendChart';

export type VectorData = ArrayLike<number>;

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

function renderedRanges(chart: Chart<'line'>, fallback?: AxisRanges) {
  const read = (key: 'x' | 'y') => {
    const { min, max } = chart.scales[key];
    return Number.isFinite(min) && Number.isFinite(max) && min !== max
      ? ([min!, max!] as AxisRanges['x'])
      : fallback?.[key];
  };
  const x = read('x');
  const y = read('y');
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
  const chartRef = React.useRef<Chart<'line'> | null>(null);
  const activeRef = React.useRef(false);
  const pendingUpdateRef = React.useRef<
    ((ranges?: AxisRanges) => void) | undefined
  >(undefined);
  const rangesRef = React.useRef<AxisRanges | undefined>(undefined);

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
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const chart = new Chart(canvas, vectorChartOption(model));
    chartRef.current = chart;
    return () => {
      chart.destroy();
      canvas.remove();
      chartRef.current = null;
    };
  }, [model]);

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
      chart.data.datasets[0].data = vectorPoints(visiblePoints);
      chart.data.datasets[0].pointRadius =
        visiblePoints.length / 2 < GRAPH_LAYOUT.vectorPointLimit
          ? GRAPH_LAYOUT.vectorPointSize
          : 0;
      chart.options.scales!.x!.min = xRange?.[0];
      chart.options.scales!.x!.max = xRange?.[1];
      chart.options.scales!.y!.min = yRange?.[0];
      chart.options.scales!.y!.max = yRange?.[1];
      chart.update('none');
      rangesRef.current = renderedRanges(
        chart,
        xRange && yRange ? { x: xRange, y: yRange } : rangesRef.current
      );
      pendingUpdateRef.current = undefined;
    },
    [model, values, ranges]
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
