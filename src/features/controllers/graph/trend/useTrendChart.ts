import React from 'react';
import { categoryLabels, type TrendMode } from './categories';
import type { PlotSettings } from '../common/api';
import type { TrendSeries } from './useTrendModel';
import { trendDatasets, trendChartOption } from './trendConfig';
import {
  buildPlotAxes,
  axisTitle,
  GRAPH_LAYOUT,
  useChart,
  useCurveVisibility,
  type AxisRanges,
  type Range,
} from '../common/api';

const HISTORY_DEBOUNCE_MS = 1000;

function presetRange(mode: Exclude<TimeRangeMode, 'uptime'>): Range {
  const end = Date.now();
  const start = new Date(end);
  if (mode === 'day' || mode === 'week') {
    start.setDate(start.getDate() - (mode === 'week' ? 7 : 1));
  } else {
    start.setTime(end - (mode === 'hour' ? 3600 : 600) * 1000);
  }
  return [start.getTime(), end];
}

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
  plotConfig,
  series,
  startTime,
  dataRevision,
  mode = 'numeric',
  requestHistory,
  resetHistory,
}: {
  plotConfig: PlotSettings;
  series: TrendSeries[];
  startTime: number;
  dataRevision: number;
  mode?: TrendMode;
  requestHistory?: (range: Range) => void;
  resetHistory?: (range: Range) => void;
}) {
  const [view, setView] = React.useState<View>({ mode: 'uptime' });
  const [yAxisWidth, setYAxisWidth] = React.useState(52);
  const [visibleRange, setVisibleRange] = React.useState<Range>();
  const latestSeriesRef = React.useRef(series);
  latestSeriesRef.current = series;
  const xRange = React.useMemo<Range | undefined>(() => {
    if (view.mode === null) return view.xRange;
    const latest = Math.max(
      startTime,
      ...series.map((item) => item.timestamps.at(-1) ?? startTime)
    );
    if (view.mode === 'uptime') {
      return [startTime, Math.max(startTime + 1000, latest)];
    }
    return presetRange(view.mode);
  }, [view, startTime, series]);

  const xRangeRef = React.useRef(xRange);
  xRangeRef.current = xRange;
  const pendingHistory = React.useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);
  const displayedRange = React.useRef<Range | undefined>(undefined);
  const requestRef = React.useRef(requestHistory);
  requestRef.current = requestHistory;
  const resetRef = React.useRef(resetHistory);
  resetRef.current = resetHistory;
  const cancelHistory = React.useCallback(() => {
    clearTimeout(pendingHistory.current);
    pendingHistory.current = undefined;
  }, []);
  const requestAll = React.useCallback((range: Range) => {
    if (latestSeriesRef.current.length) {
      requestRef.current?.(range);
    }
  }, []);

  const rememberRange = React.useCallback((range: Range) => {
    const values = [...range].sort((a, b) => a - b) as Range;
    displayedRange.current = values;
    setVisibleRange((current) =>
      current?.[0] === values[0] && current?.[1] === values[1]
        ? current
        : values
    );
  }, []);
  const follow = React.useCallback(
    (mode: TimeRangeMode) => {
      cancelHistory();
      if (mode !== 'uptime') {
        const range = presetRange(mode);
        requestAll(range);
      }
      setView((current) => ({ ...current, mode }));
    },
    [cancelHistory, requestAll]
  );
  const pause = React.useCallback(
    (nextXRange: Range, nextYRange?: Range) => {
      const currentXRange = displayedRange.current ?? xRangeRef.current;
      rememberRange(nextXRange);
      if (
        nextXRange[0] !== currentXRange?.[0] ||
        nextXRange[1] !== currentXRange?.[1]
      ) {
        cancelHistory();
        const range = [...nextXRange].sort((a, b) => a - b) as Range;
        pendingHistory.current = setTimeout(() => {
          pendingHistory.current = undefined;
          requestAll(range);
        }, HISTORY_DEBOUNCE_MS);
      }
      setView((current) => ({
        ...current,
        mode: null,
        xRange: nextXRange,
        yRange: nextYRange ?? current.yRange,
      }));
    },
    [rememberRange, cancelHistory, requestAll]
  );
  const onReset = React.useCallback(() => {
    cancelHistory();
    setView({ mode: 'uptime' });
  }, [cancelHistory]);
  const seriesKeys = JSON.stringify(series.map((item) => item.key));
  React.useEffect(
    () => cancelHistory,
    [seriesKeys, mode, startTime, plotConfig, cancelHistory]
  );
  const axes = React.useMemo(
    () =>
      buildPlotAxes(plotConfig, {
        timeX: true,
        categories: categoryLabels(mode),
      }),
    [plotConfig, mode]
  );
  const numericYAxisWidth = axisTitle(axes.y.label, axes.y.units)
    ? GRAPH_LAYOUT.yAxisSize.titled
    : GRAPH_LAYOUT.yAxisSize.untitled;
  const buildData = React.useCallback(
    () => ({ datasets: trendDatasets(series, plotConfig) }),
    [series, plotConfig]
  );
  const onRanges = React.useCallback(
    (ranges: AxisRanges) => rememberRange(ranges.x),
    [rememberRange]
  );
  const chart = useChart({
    axes,
    configuration: () =>
      trendChartOption(
        plotConfig,
        latestSeriesRef.current,
        undefined,
        undefined,
        axes,
        setYAxisWidth
      ),
    identity: [plotConfig, seriesKeys, mode],
    xRange,
    yRange: view.yRange,
    onComplete: pause,
    onReset,
    onRanges,
    buildData,
    dataRevision,
  });
  const { containerRef, selectionRef } = chart;
  const { hiddenCurves, toggleCurve } = useCurveVisibility({
    keys: JSON.parse(seriesKeys),
    chart,
  });

  const reloadHistory = React.useCallback(() => {
    const range = displayedRange.current ?? xRangeRef.current;
    if (!range) {
      return;
    }
    cancelHistory();
    const yRange = chart.rangesRef.current?.y ?? view.yRange ?? axes.y.range;
    rememberRange(range);
    setView({ mode: null, xRange: range, yRange });
    resetRef.current?.(range);
  }, [cancelHistory, rememberRange, chart.rangesRef, view.yRange, axes]);

  const yRange = view.yRange;
  return {
    yAxisWidth:
      mode === 'numeric' ? (chart.yAxisWidth ?? numericYAxisWidth) : yAxisWidth,
    containerRef,
    selectionRef,
    tool: chart.tool,
    selectTool: chart.selectTool,
    mode: view.mode,
    visibleRange,
    follow,
    reset: chart.reset,
    reloadHistory,
    xRange,
    yRange,
    pause,
    rememberRange,
    hiddenCurves,
    toggleCurve,
  };
}
