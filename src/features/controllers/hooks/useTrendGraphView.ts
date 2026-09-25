import { useCallback, useMemo, useState } from 'react';
import type { TrendSeries } from './useDisplayTrendGraph';

type Range = [number, number];
type MouseTool = 'pointer' | 'zoom' | 'pan';
type TimeRangeMode = 'uptime' | 'week' | 'day' | 'hour' | 'tenMinutes';
type View = {
  mode: TimeRangeMode | null;
  xRange?: Range;
  yRange?: Range;
};

export function useTrendGraphView(startTime: number, series: TrendSeries[]) {
  const [tool, setTool] = useState<MouseTool>('pointer');
  const [view, setView] = useState<View>({
    mode: 'uptime',
  });
  const [visibleRange, setVisibleRange] = useState<Range>();

  const xRange = useMemo<Range | undefined>(() => {
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

  const rememberRange = useCallback((range: Range) => {
    const values = [...range].sort((a, b) => a - b) as Range;
    setVisibleRange((current) =>
      current?.[0] === values[0] && current?.[1] === values[1]
        ? current
        : values
    );
  }, []);

  const follow = useCallback((mode: TimeRangeMode) => {
    setView((current) => ({ ...current, mode }));
  }, []);

  const pause = useCallback(
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

  const reset = useCallback(() => setView({ mode: 'uptime' }), []);

  const selectTool = useCallback(
    (next: MouseTool) =>
      setTool((current) => (current === next ? 'pointer' : next)),
    []
  );

  return {
    tool,
    selectTool,
    mode: view.mode,
    xRange,
    visibleRange,
    yRange: view.yRange,
    follow,
    pause,
    reset,
    rememberRange,
  };
}
