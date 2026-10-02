import React from 'react';
import type { PlotSettings } from './common/api';
import type { PropertyProxy } from '@/lib/binding/api';
import { lttbWithCoordinates } from '../utils/lttb';
import { barChartOption, vectorChartOption } from './chartConfig';
import {
  visibleVectorRange,
  vectorPoints,
  BAR_SAMPLE_LIMIT,
  VECTOR_POINT_LIMIT,
  chooseVectorTargetPoints,
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
 * Coordinates vector and bar plots: selects the chart configuration, samples
 * visible data, and applies navigation ranges to the shared Chart.js plot.
 */
export function useVectorChart({
  plotConfig,
  proxy,
}: {
  plotConfig: PlotSettings;
  proxy: PropertyProxy | undefined;
}) {
  const isBar = 'bar_width' in plotConfig;
  const logarithmicX = !isBar && plotConfig.x_log;
  const { values } = useVectorData(proxy);
  const axes = React.useMemo(
    () => buildPlotAxes(plotConfig, { bar: isBar }),
    [plotConfig, isBar]
  );
  const ranges = useChartRanges(axes);
  const buildData = React.useCallback(
    (xRange?: Range) => {
      const [start, end] = visibleVectorRange(
        values.length,
        xRange,
        logarithmicX,
        isBar ? undefined : plotConfig
      );
      const visiblePoints = lttbWithCoordinates(
        values,
        isBar
          ? Math.min(BAR_SAMPLE_LIMIT, end - start)
          : chooseVectorTargetPoints(end - start),
        {
          start,
          end,
          offset: isBar ? 0 : plotConfig.offset,
          step: isBar ? 1 : plotConfig.step,
        }
      );
      const pointRadius =
        !isBar && visiblePoints.length / 2 < VECTOR_POINT_LIMIT
          ? GRAPH_LAYOUT.vectorPointSize
          : 0;
      return { datasets: [{ data: vectorPoints(visiblePoints) }], pointRadius };
    },
    [plotConfig, values, isBar, logarithmicX]
  );
  const chart = useChart({
    axes,
    configuration: () =>
      isBar
        ? barChartOption(plotConfig, undefined, undefined, axes)
        : vectorChartOption(plotConfig, undefined, undefined, axes),
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
