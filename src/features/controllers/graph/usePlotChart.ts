import React from 'react';
import { isTypedArray } from '@/karabo/data/api';
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
  getSamplingWindow,
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
import { getSampleThreshold, lttbWithCoordinates } from '../utils/lttb';

function trimVector(values: VectorData, length: number): VectorData {
  if (values.length === length) {
    return values;
  }
  if (
    isTypedArray(values) &&
    !(values instanceof BigInt64Array) &&
    !(values instanceof BigUint64Array)
  ) {
    return values.subarray(0, length);
  }
  return Float64Array.from({ length }, (_, index) => values[index]);
}

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
  const length = ySeries.reduce(
    (length, item) => Math.max(length, item.values.length),
    0
  );
  const xBaseline = React.useMemo(
    () => xValues ?? generateBaseline({ length }, offset, step),
    [xValues, length, offset, step]
  );
  const vectors = React.useMemo(
    () =>
      ySeries.map((item) => {
        const length = Math.min(xBaseline.length, item.values.length);
        // Align each series once per frame; typed vectors retain their storage.
        return {
          x: trimVector(xBaseline, length),
          y: trimVector(item.values, length),
        };
      }),
    [ySeries, xBaseline]
  );
  const axes = React.useMemo(() => buildPlotAxes(plotConfig), [plotConfig]);
  const ranges = useChartRanges(axes);
  const buildData = React.useCallback(
    (xRange?: Range) => {
      // Pad sampling without changing the displayed axes, retaining crossing
      // segments at the viewport edges. Pair each Y with X independently.
      const samplingRange = padViewportRange(xRange, logarithmicX);
      return {
        datasets: vectors.map(({ x, y }) => {
          let start = 0;
          let end = x.length;
          let threshold: number;
          switch (kind) {
            case 'scatter':
              // Scatter frames preserve every point, including unordered X.
              threshold = x.length;
              break;
            case 'scatter-line':
            case 'line':
              ({ start, end } = getSamplingWindow({ x, range: samplingRange }));
              threshold = getSampleThreshold(end - start);
              break;
            case 'bar':
              ({ start, end } = getSamplingWindow({ x, range: samplingRange }));
              threshold = BAR_SAMPLE_LIMIT;
              break;
          }
          return {
            data: lttbWithCoordinates({ y, x, start, end, threshold }),
          };
        }),
      };
    },
    [vectors, logarithmicX, kind]
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
