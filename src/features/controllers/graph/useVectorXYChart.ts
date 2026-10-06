import React from 'react';
import { vectorXYChartOption } from './plotConfig';
import {
  vectorPoints,
  generateDownsample,
  padViewportRange,
  type VectorData,
} from './utils';
import {
  buildPlotAxes,
  useChart,
  useChartRanges,
  useCurveVisibility,
  type PlotSettings,
  type Range,
} from './common/api';
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
  const visibility = useCurveVisibility({
    keys: JSON.parse(seriesKeys),
    chart,
  });
  return { ...chart, ...visibility };
}
