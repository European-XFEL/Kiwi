import React from 'react';
import { vectorXYChartOption } from './chartConfig';
import { vectorPoints, generateDownsample, padViewportRange } from './utils';
import {
  buildPlotAxes,
  useChart,
  useChartRanges,
  type PlotSettings,
  type Range,
} from './common/api';
import type { VectorData } from './normalizeVector';
import type { VectorXYSeries } from './useVectorXYData';

/**
 * Keep complete X/Y vectors independent of navigation and construct display
 * data for the current view. The shared chart defers updates during gestures.
 */
export function useVectorXYChart({
  plotConfig,
  x,
  series,
}: {
  plotConfig: PlotSettings;
  x: VectorData;
  series: VectorXYSeries[];
}) {
  const axes = React.useMemo(() => buildPlotAxes(plotConfig), [plotConfig]);
  const ranges = useChartRanges(axes);
  const seriesKeys = JSON.stringify(series.map((item) => item.key));
  const [hiddenCurves, setHiddenCurves] = React.useState<Set<string>>(
    () => new Set()
  );
  const buildData = React.useCallback(
    (xRange?: Range) => {
      // Pad the sampling window, not the displayed axes, so nearby line
      // segments remain available at the viewport edges without flickering.
      // Each Y is paired with X independently; source vectors stay unchanged.
      const samplingRange = padViewportRange(xRange, plotConfig.x_log);
      return {
        datasets: series.map((item) => ({
          data: vectorPoints(generateDownsample(item.values, x, samplingRange)),
        })),
      };
    },
    [x, series, plotConfig.x_log]
  );
  const chart = useChart({
    axes,
    configuration: () =>
      vectorXYChartOption(plotConfig, JSON.parse(seriesKeys), axes),
    // Configuration or ordered curve keys require new datasets and a new
    // chart. Value and view-range updates reuse the existing chart instance.
    identity: [plotConfig, seriesKeys],
    xRange: ranges.xRange,
    yRange: ranges.yRange,
    onComplete: ranges.pause,
    onReset: ranges.reset,
    buildData,
  });
  const { setVisible, viewport, rangesRef } = chart;
  React.useLayoutEffect(() => {
    // Visibility belongs to property keys, so restore it at the current
    // dataset indices after curve reordering or chart recreation.
    const keys: string[] = JSON.parse(seriesKeys);
    keys.forEach((key, index) => setVisible(index, !hiddenCurves.has(key)));
    // Hiding a curve can change autorange; navigation must use the new bounds.
    rangesRef.current = viewport.readRanges(rangesRef.current);
  }, [plotConfig, seriesKeys, hiddenCurves, setVisible, viewport, rangesRef]);
  const toggleCurve = React.useCallback((key: string) => {
    setHiddenCurves((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  return { ...chart, hiddenCurves, toggleCurve };
}
