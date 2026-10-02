import React from 'react';
import type { PlotSettings } from '../common/api';
import type { TrendSeries } from './useTrendModel';
import { trendDatasets, trendChartOption } from '../chartConfig';
import {
  buildPlotAxes,
  useChart,
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
  plotConfig,
  series,
  startTime,
  dataRevision,
}: {
  plotConfig: PlotSettings;
  series: TrendSeries[];
  startTime: number;
  dataRevision: number;
}) {
  const [view, setView] = React.useState<View>({ mode: 'uptime' });
  const [visibleRange, setVisibleRange] = React.useState<Range>();
  const latestSeriesRef = React.useRef(series);
  latestSeriesRef.current = series;
  const [hiddenCurves, setHiddenCurves] = React.useState<Set<string>>(
    () => new Set()
  );
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
  const seriesKeys = series.map((item) => item.key).join('\0');
  const axes = React.useMemo(
    () => buildPlotAxes(plotConfig, { timeX: true }),
    [plotConfig]
  );
  const buildData = React.useCallback(
    () => ({ datasets: trendDatasets(series) }),
    [series]
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
        axes
      ),
    identity: [plotConfig, seriesKeys],
    xRange,
    yRange: view.yRange,
    onComplete: pause,
    onReset: reset,
    onRanges,
    buildData,
    dataRevision,
  });
  const {
    containerRef,
    selectionRef,
    viewport,
    setVisible,
    isVisible,
    findDataset,
  } = chart;

  React.useLayoutEffect(() => {
    seriesKeys
      .split('\0')
      .filter(Boolean)
      .forEach((key, index) => {
        const visible = !hiddenCurves.has(key);
        setVisible(index, visible);
      });
    chart.rangesRef.current = viewport.readRanges(chart.rangesRef.current);
  }, [seriesKeys, hiddenCurves, chart.rangesRef, setVisible, viewport]);
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
  return {
    containerRef,
    selectionRef,
    tool: chart.tool,
    selectTool: chart.selectTool,
    mode: view.mode,
    visibleRange,
    follow,
    reset: chart.reset,
    xRange,
    yRange,
    pause,
    rememberRange,
    hiddenCurves,
    toggleCurve,
  };
}
