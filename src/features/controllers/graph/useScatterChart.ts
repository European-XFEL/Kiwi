import React from 'react';
import type { PlotSettings } from './common/api';
import type { PropertyProxy } from '@/lib/binding/api';
import { buildPlotAxes, useChart, useChartRanges } from './common/api';
import { scatterChartOption } from './plotConfig';
import { useScatterData } from './useScatterData';

export function useScatterChart({
  plotConfig,
  proxies,
}: {
  plotConfig: PlotSettings;
  proxies: PropertyProxy[];
}) {
  const { points, dataRevision, clear } = useScatterData(
    proxies,
    plotConfig.maxlen
  );
  const axes = React.useMemo(() => buildPlotAxes(plotConfig), [plotConfig]);
  const ranges = useChartRanges(axes);
  const buildData = React.useCallback(
    () => ({ datasets: [{ data: points }] }),
    [points]
  );
  const chart = useChart({
    axes,
    configuration: () => scatterChartOption(plotConfig, axes),
    identity: [plotConfig],
    xRange: ranges.xRange,
    yRange: ranges.yRange,
    onComplete: ranges.pause,
    onReset: ranges.reset,
    buildData,
    dataRevision,
  });
  return {
    containerRef: chart.containerRef,
    selectionRef: chart.selectionRef,
    tool: chart.tool,
    selectTool: chart.selectTool,
    reset: chart.reset,
    clear: () => {
      ranges.preserve(chart.viewport.readRanges());
      clear();
    },
  };
}
