import React from 'react';
import type { PropertyProxy } from '@/lib/binding/api';
import {
  buildPlotAxes,
  useChart,
  useChartRanges,
  type PlotSettings,
  type Range,
} from './common/api';
import { barChartOption } from './plotConfig';
import { useVectorBarData } from './useVectorBarData';
import {
  BAR_SAMPLE_LIMIT,
  generateDownsample,
  padViewportRange,
  vectorPoints,
} from './utils';

/** Samples indexed bars for the viewport and applies chart navigation ranges. */
export function useVectorBarChart({
  plotConfig,
  proxy,
}: {
  plotConfig: PlotSettings;
  proxy: PropertyProxy | undefined;
}) {
  const { values } = useVectorBarData(proxy);
  const coordinates = React.useMemo(
    () => Float64Array.from({ length: values.length }, (_, index) => index),
    [values.length]
  );
  const axes = React.useMemo(
    () => buildPlotAxes(plotConfig, { bar: true }),
    [plotConfig]
  );
  const ranges = useChartRanges(axes);
  const buildData = React.useCallback(
    (xRange?: Range) => {
      // Pad the sampling window while leaving the displayed range unchanged.
      const visiblePoints = generateDownsample(
        values,
        coordinates,
        padViewportRange(xRange),
        BAR_SAMPLE_LIMIT
      );
      return {
        datasets: [{ data: vectorPoints(visiblePoints) }],
        pointRadius: 0,
      };
    },
    [values, coordinates]
  );
  const chart = useChart({
    axes,
    configuration: () => barChartOption(plotConfig, undefined, undefined, axes),
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
