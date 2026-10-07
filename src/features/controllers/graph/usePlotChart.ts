import React from 'react';
import type { PlotSettings } from './common/api';
import {
  vectorChartOption,
  vectorXYChartOption,
  vectorScatterChartOption,
  barChartOption,
  scatterChartOption,
} from './plotConfig';
import {
  BAR_SAMPLE_LIMIT,
  padViewportRange,
  generateBaseline,
  generateDownsample,
  vectorPoints,
  type VectorData,
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
 * Coordinates plots: selects the chart configuration, samples
 * visible data, and applies navigation ranges to the shared Chart.js plot.
 */
export function usePlotChart({
  plotConfig,
  ySeries,
  xValues,
  kind = 'line',
}: {
  plotConfig: PlotSettings;
  ySeries: VectorSeries[];
  xValues?: VectorData;
  kind?: 'line' | 'bar' | 'scatter-line' | 'scatter';
}) {
  const logarithmicX = plotConfig.x_log;
  const ySeriesKeys = JSON.stringify(ySeries.map((item) => item.key));
  const offset = plotConfig.offset ?? 0;
  const step = plotConfig.step || 1;
  const coordinates = React.useMemo(
    () =>
      ySeries.map(
        (item) => xValues ?? generateBaseline(item.values, offset, step)
      ),
    [ySeries, xValues, offset, step]
  );
  const axes = React.useMemo(() => buildPlotAxes(plotConfig), [plotConfig]);
  const ranges = useChartRanges(axes);
  const buildData = React.useCallback(
    (xRange?: Range) => {
      // Pad sampling without changing the displayed axes, retaining crossing
      // segments at the viewport edges. Pair each Y with X independently.
      const samplingRange = padViewportRange(xRange, logarithmicX);
      return {
        datasets: ySeries.map((item, index) => {
          let points: [VectorData, VectorData];
          if (kind === 'scatter-line' || kind === 'scatter') {
            // Scatter frames preserve every point, including unordered X.
            points = [coordinates[index], item.values];
          } else if (kind === 'bar') {
            points = generateDownsample(
              item.values,
              coordinates[index],
              samplingRange,
              BAR_SAMPLE_LIMIT
            );
          } else {
            points = generateDownsample(
              item.values,
              coordinates[index],
              samplingRange
            );
          }
          return { data: vectorPoints(points) };
        }),
      };
    },
    [ySeries, coordinates, logarithmicX, kind]
  );
  const chart = useChart({
    axes,
    configuration: () => {
      switch (kind) {
        case 'line':
          if (xValues !== undefined) {
            return vectorXYChartOption(
              plotConfig,
              JSON.parse(ySeriesKeys),
              axes
            );
          }
          return vectorChartOption(plotConfig, JSON.parse(ySeriesKeys), axes);
        case 'bar':
          return barChartOption(plotConfig, undefined, undefined, axes);
        case 'scatter-line':
          return vectorScatterChartOption(
            plotConfig,
            JSON.parse(ySeriesKeys),
            axes
          );
        case 'scatter':
          return scatterChartOption(plotConfig, axes);
      }
    },
    identity: [plotConfig, ySeriesKeys, xValues !== undefined, kind],
    xRange: ranges.xRange,
    yRange: ranges.yRange,
    onComplete: ranges.pause,
    onReset: ranges.reset,
    buildData,
  });
  const visibility = useCurveVisibility({
    keys: JSON.parse(ySeriesKeys),
    chart,
  });
  return { ...chart, ...visibility };
}
