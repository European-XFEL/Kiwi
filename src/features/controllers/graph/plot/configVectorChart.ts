import type { ChartConfiguration } from 'chart.js';
import type { DisplayVectorGraphModel } from '@/karabo/common/api';
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
  model: DisplayVectorGraphModel,
  xRange?: Range,
  yRange?: Range
): ChartConfiguration<'line'> {
  const config = commonChartOption(model, model.x_log, xRange, yRange);
  Object.assign(config.data.datasets[0], {
    borderColor: TRACE_COLORS[0],
    backgroundColor: TRACE_COLORS[0],
    borderWidth: GRAPH_LAYOUT.lineWidth,
    pointRadius: 0,
    pointHoverRadius: 0,
  });
  return config;
}
