import React from 'react';
import type { PlotSettings } from './common/api';
import { vectorChartOption } from './plotConfig';
import {
  padViewportRange,
  generateBaseline,
  generateDownsample,
  vectorPoints,
} from './utils';
import {
  buildPlotAxes,
  useChart,
  useChartRanges,
  type Range,
  useCurveVisibility,
} from './common/api';
import type { VectorSeries } from './useVectorSeries';

/**
 * Coordinates vector plots: selects the chart configuration, samples
 * visible data, and applies navigation ranges to the shared Chart.js plot.
 */
export function useVectorChart({
  plotConfig,
  series,
}: {
  plotConfig: PlotSettings;
  series: VectorSeries[];
}) {
  const logarithmicX = plotConfig.x_log;
  const seriesKeys = JSON.stringify(series.map((item) => item.key));
  const offset = plotConfig.offset ?? 0;
  const step = plotConfig.step || 1;
  const coordinates = React.useMemo(
    () => series.map((item) => generateBaseline(item.values, offset, step)),
    [series, offset, step]
  );
  const axes = React.useMemo(() => buildPlotAxes(plotConfig), [plotConfig]);
  const ranges = useChartRanges(axes);
  const buildData = React.useCallback(
    (xRange?: Range) => {
      const samplingRange = padViewportRange(xRange, logarithmicX);
      return {
        datasets: series.map((item, index) => ({
          data: vectorPoints(
            generateDownsample(item.values, coordinates[index], samplingRange)
          ),
        })),
      };
    },
    [series, coordinates, logarithmicX]
  );
  const chart = useChart({
    axes,
    configuration: () =>
      vectorChartOption(plotConfig, JSON.parse(seriesKeys), axes),
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
