import React from 'react';
import type { PlotSettings } from './common/api';
import type { PropertyProxy } from '@/lib/binding/api';
import { vectorChartOption } from './plotConfig';
import {
  padViewportRange,
  generateBaseline,
  generateDownsample,
  vectorPoints,
  VECTOR_POINT_LIMIT,
} from './utils';
import {
  GRAPH_LAYOUT,
  buildPlotAxes,
  useChart,
  useChartRanges,
  type Range,
} from './common/api';
import { useVectorData } from './useVectorData';

/**
 * Coordinates vector plots: selects the chart configuration, samples
 * visible data, and applies navigation ranges to the shared Chart.js plot.
 */
export function useVectorChart({
  plotConfig,
  proxy,
}: {
  plotConfig: PlotSettings;
  proxy: PropertyProxy | undefined;
}) {
  const logarithmicX = plotConfig.x_log;
  const { values } = useVectorData(proxy);
  const offset = plotConfig.offset ?? 0;
  const step = plotConfig.step || 1;
  const coordinates = React.useMemo(
    () => generateBaseline(values, offset, step),
    [values, offset, step]
  );
  const axes = React.useMemo(() => buildPlotAxes(plotConfig), [plotConfig]);
  const ranges = useChartRanges(axes);
  const buildData = React.useCallback(
    (xRange?: Range) => {
      const samplingRange = padViewportRange(xRange, logarithmicX);
      const visiblePoints = generateDownsample(
        values,
        coordinates,
        samplingRange
      );
      const pointRadius =
        visiblePoints[0].length < VECTOR_POINT_LIMIT
          ? GRAPH_LAYOUT.vectorPointSize
          : 0;
      return { datasets: [{ data: vectorPoints(visiblePoints) }], pointRadius };
    },
    [values, coordinates, logarithmicX]
  );
  const chart = useChart({
    axes,
    configuration: () =>
      vectorChartOption(plotConfig, undefined, undefined, axes),
    identity: [plotConfig],
    xRange: ranges.xRange,
    yRange: ranges.yRange,
    onComplete: ranges.pause,
    onReset: ranges.reset,
    buildData,
  });
  return {
    containerRef: chart.containerRef,
    selectionRef: chart.selectionRef,
    tool: chart.tool,
    selectTool: chart.selectTool,
    reset: chart.reset,
  };
}
