import React from 'react';
import type { ChartConfiguration } from 'chart.js';
import type { PlotAxesConfig } from '../graphAxes';
import { GRAPH_LAYOUT, type Range } from './constants';
import type { AxisRanges } from './useMouseGestures';
import { usePlotItem } from './usePlotItem';
import { useViewBox } from './useViewBox';

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
  const [revision, setRevision] = React.useState(0);
  const pendingUpdateRef = React.useRef<
    ((ranges?: AxisRanges) => void) | undefined
  >(undefined);
  const onFinish = React.useCallback((ranges?: AxisRanges) => {
    pendingUpdateRef.current?.(ranges);
  }, []);
  const reset = React.useCallback(() => {
    onReset();
    setRevision((current) => current + 1);
  }, [onReset]);
  const plotItem = usePlotItem(configuration, identity);
  const { containerRef, viewport, update } = plotItem;
  const viewBox = useViewBox({
    containerRef,
    selectionRef,
    viewport,
    inverted: { x: axes.x.inverted, y: axes.y.inverted },
    logarithmicX: axes.x.kind === 'numeric' && axes.x.scale === 'logarithmic',
    logarithmicY: axes.y.scale === 'logarithmic',
    onComplete,
    onFinish,
    onReset: reset,
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
            y: nextY ?? viewBox.rangesRef.current?.y ?? ([0, 1] as Range),
          }
        : viewBox.rangesRef.current;
      const ranges = viewport.readRanges(fallback);
      viewBox.rangesRef.current = ranges;
      if (ranges) onRanges?.(ranges);
      pendingUpdateRef.current = undefined;
    },
    [
      axes,
      xRange,
      yRange,
      buildData,
      update,
      viewport,
      viewBox.rangesRef,
      onRanges,
    ]
  );

  React.useLayoutEffect(() => {
    if (viewBox.activeRef.current) {
      pendingUpdateRef.current = applyLatest;
      return;
    }
    applyLatest();
  }, [applyLatest, revision, dataRevision, viewBox.activeRef]);

  return {
    ...plotItem,
    ...viewBox,
    selectionRef,
    yAxisWidth:
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
