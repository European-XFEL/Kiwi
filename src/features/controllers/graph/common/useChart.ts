import React from 'react';
import type { ChartConfiguration } from 'chart.js';
import type { PlotAxesConfig } from '../graphAxes';
import { GRAPH_LAYOUT, type Range } from './constants';
import { useMouseGestures, type AxisRanges } from './useMouseGestures';
import type { ChartMouseTool } from './components/ChartToolBar';
import { usePlotItem } from './usePlotItem';

type ChartData<T extends 'line' | 'scatter'> = {
  datasets: ChartConfiguration<T>['data']['datasets'];
  pointRadius?: number;
};

/** Publishes the latest data after navigation and keeps gesture ranges in sync. */
export function useChart<T extends 'line' | 'scatter'>({
  axes,
  configuration,
  identity,
  xRange,
  yRange,
  onComplete,
  onReset,
  onRanges,
  buildData,
  dataRevision,
}: {
  axes: PlotAxesConfig;
  configuration: () => ChartConfiguration<T>;
  identity: readonly unknown[];
  xRange?: Range;
  yRange?: Range;
  onComplete: (x: Range, y: Range) => void;
  onReset: () => void;
  onRanges?: (ranges: AxisRanges) => void;
  buildData: (xRange?: Range, yRange?: Range) => ChartData<T>;
  dataRevision?: number;
}) {
  const selectionRef = React.useRef<HTMLDivElement>(null);
  const [tool, setTool] = React.useState<ChartMouseTool>('pointer');
  const rangesRef = React.useRef<AxisRanges | undefined>(undefined);
  const activeRef = React.useRef(false);
  const [revision, setRevision] = React.useState(0);
  const pendingUpdateRef = React.useRef<
    ((ranges?: AxisRanges) => void) | undefined
  >(undefined);
  const finish = React.useCallback(() => {
    pendingUpdateRef.current?.(rangesRef.current);
  }, []);
  const reset = React.useCallback(() => {
    onReset();
    setRevision((current) => current + 1);
  }, [onReset]);
  const plotItem = usePlotItem(configuration, identity);
  const { containerRef, viewport, update } = plotItem;
  const getRanges = React.useCallback(() => rangesRef.current, []);
  const setRanges = React.useCallback(
    (ranges: AxisRanges) => {
      rangesRef.current = ranges;
      viewport.setRanges(ranges);
    },
    [viewport]
  );
  const selectTool = React.useCallback(
    (next: ChartMouseTool) =>
      setTool((current) => (current === next ? 'pointer' : next)),
    []
  );
  useMouseGestures({
    containerRef,
    selectionRef,
    viewport,
    inverted: { x: axes.x.inverted, y: axes.y.inverted },
    logarithmicX: axes.x.kind === 'numeric' && axes.x.scale === 'logarithmic',
    logarithmicY: axes.y.scale === 'logarithmic',
    tool,
    activeRef,
    getRanges,
    setRanges,
    complete: onComplete,
    finish,
    reset,
  });
  const applyLatest = React.useCallback(
    (gestureRanges?: AxisRanges) => {
      const nextX = gestureRanges?.x ?? xRange ?? axes.x.range;
      const nextY = gestureRanges?.y ?? yRange ?? axes.y.range;
      const { datasets, pointRadius } = buildData(nextX, nextY);
      update(datasets, nextX, nextY, pointRadius);
      const fallback = nextX
        ? {
            x: nextX,
            y: nextY ?? rangesRef.current?.y ?? ([0, 1] as Range),
          }
        : rangesRef.current;
      const ranges = viewport.readRanges(fallback);
      rangesRef.current = ranges;
      if (ranges) onRanges?.(ranges);
      pendingUpdateRef.current = undefined;
    },
    [axes, xRange, yRange, buildData, update, viewport, onRanges]
  );

  React.useLayoutEffect(() => {
    if (activeRef.current) {
      pendingUpdateRef.current = applyLatest;
      return;
    }
    applyLatest();
  }, [applyLatest, revision, dataRevision]);

  return {
    ...plotItem,
    tool,
    selectTool,
    reset,
    rangesRef,
    activeRef,
    selectionRef,
    yAxisWidth:
      plotItem.yAxisWidth ??
      GRAPH_LAYOUT.yAxisSize[
        axes.y.label || axes.y.units ? 'titled' : 'untitled'
      ],
  };
}

/** Selected ranges override configured ranges until reset. */
export function useChartRanges(axes: PlotAxesConfig) {
  const [ranges, setRanges] = React.useState<AxisRanges>();
  const pause = React.useCallback((x: AxisRanges['x'], y: AxisRanges['y']) => {
    setRanges({ x, y });
  }, []);
  const reset = React.useCallback(() => setRanges(undefined), []);
  const preserve = React.useCallback((current?: AxisRanges) => {
    if (current) setRanges(current);
  }, []);
  return {
    xRange: ranges?.x ?? axes.x.range,
    yRange: ranges?.y ?? axes.y.range,
    pause,
    reset,
    preserve,
  };
}
