import type { ChartConfiguration } from 'chart.js';
import type { PlotSettings } from '../common/api';
import {
  commonChartOption,
  GRAPH_LAYOUT,
  TRACE_COLORS,
  type Range,
} from '../common/api';

export const VECTOR_POINT_LIMIT = 300;

export function chooseVectorTargetPoints(length: number) {
  return length >= 1_500_000 ? 60_000 : length;
}

export function vectorChartOption(
  plotConfig: PlotSettings,
  xRange?: Range,
  yRange?: Range
): ChartConfiguration<'line'> {
  const config = commonChartOption(
    plotConfig,
    plotConfig.x_log,
    xRange,
    yRange
  );
  if (plotConfig.step < 0) {
    config.options!.parsing = {};
    config.options!.normalized = false;
  }
  Object.assign(config.data.datasets[0], {
    borderColor: TRACE_COLORS[0],
    backgroundColor: TRACE_COLORS[0],
    borderWidth: GRAPH_LAYOUT.lineWidth,
    pointRadius: 0,
    pointHoverRadius: 0,
  });
  return config;
}
