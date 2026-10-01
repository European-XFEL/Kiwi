import React from 'react';
import type { DisplayTrendGraphModel } from '@/karabo/common/api';
import type { TrendSeries } from './useTrendModel';
import {
  fixedXRange,
  fixedYRange,
  trendDatasets,
  trendChartOption,
} from './configTrendChart';
import {
  usePlotItem,
  useViewBox,
  type AxisRanges,
  type Range,
} from '../common/api';

type TimeRangeMode = 'uptime' | 'week' | 'day' | 'hour' | 'tenMinutes';
type View = {
  mode: TimeRangeMode | null;
  xRange?: Range;
  yRange?: Range;
};

/**
 * Coordinates trend plotting: owns time ranges and curve visibility, then
 * updates the shared Chart.js plot as published series or navigation change.
 */
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
  const [view, setView] = React.useState<View>({ mode: 'uptime' });
  const [visibleRange, setVisibleRange] = React.useState<Range>();
  const selectionRef = React.useRef<HTMLDivElement>(null);
  const latestSeriesRef = React.useRef(series);
  latestSeriesRef.current = series;
  const [hiddenCurves, setHiddenCurves] = React.useState<Set<string>>(
    () => new Set()
  );
  const pendingUpdateRef = React.useRef<
    ((ranges?: AxisRanges) => void) | undefined
  >(undefined);

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
  const onFinish = React.useCallback((ranges?: AxisRanges) => {
    pendingUpdateRef.current?.(ranges);
  }, []);
  const seriesKeys = series.map((item) => item.key).join('\0');
  const plotItem = usePlotItem(
    () => trendChartOption(model, latestSeriesRef.current),
    [model, seriesKeys]
  );
  const { containerRef, viewport, update, setVisible, isVisible, findDataset } =
    plotItem;

  const viewBox = useViewBox({
    containerRef,
    selectionRef,
    viewport,
    inverted: { x: model.x_invert, y: model.y_invert },
    logarithmicX: false,
    logarithmicY: model.y_log,
    onComplete: pause,
    onFinish,
    onReset: reset,
  });

  React.useLayoutEffect(() => {
    seriesKeys
      .split('\0')
      .filter(Boolean)
      .forEach((key, index) => {
        const visible = !hiddenCurves.has(key);
        setVisible(index, visible);
      });
    viewBox.rangesRef.current = viewport.readRanges(viewBox.rangesRef.current);
  }, [seriesKeys, hiddenCurves, viewBox.rangesRef, setVisible, viewport]);
  const toggleCurve = React.useCallback(
    (key: string) => {
      const index = findDataset(key);
      if (index === undefined || index < 0) return;
      const visible = !isVisible(index);
      setVisible(index, visible);
      setHiddenCurves((current) => {
        const next = new Set(current);
        if (visible) next.delete(key);
        else next.add(key);
        return next;
      });
    },
    [findDataset, isVisible, setVisible]
  );

  const yRange = view.yRange;
  const applyLatest = React.useCallback(
    (gestureRanges?: AxisRanges) => {
      const nextX = gestureRanges?.x ?? xRange ?? fixedXRange(model);
      const nextY = gestureRanges?.y ?? yRange ?? fixedYRange(model);
      update(trendDatasets(series), nextX, nextY);
      const fallback: AxisRanges | undefined = nextX
        ? { x: nextX, y: nextY ?? viewBox.rangesRef.current?.y ?? [0, 1] }
        : viewBox.rangesRef.current;
      const ranges = viewport.readRanges(fallback);
      viewBox.rangesRef.current = ranges;
      if (ranges) rememberRange(ranges.x);
      pendingUpdateRef.current = undefined;
    },
    [
      model,
      rememberRange,
      series,
      xRange,
      yRange,
      viewBox.rangesRef,
      update,
      viewport,
    ]
  );

  React.useLayoutEffect(() => {
    if (viewBox.activeRef.current) {
      // Replace the pending work so finishing a drag applies the latest samples.
      pendingUpdateRef.current = applyLatest;
      return;
    }
    applyLatest();
  }, [applyLatest, dataRevision, viewBox.activeRef]);

  return {
    containerRef,
    selectionRef,
    tool: viewBox.tool,
    selectTool: viewBox.selectTool,
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
