import type { ChartConfiguration } from 'chart.js';
import type { VectorBarGraphModel } from '@/karabo/common/api';
import { commonChartOption, type Range } from '../common/api';
import { vectorBarPlugin } from './vectorBarPlugin';

export const BAR_SAMPLE_LIMIT = 3000;

export function barChartOption(
  model: VectorBarGraphModel,
  xRange?: Range,
  yRange?: Range
): ChartConfiguration<'line'> {
  const config = commonChartOption(model, false, xRange, yRange, true);
  config.data.datasets[0].showLine = false;
  config.data.datasets[0].pointRadius = 0;
  config.plugins = [
    ...(config.plugins ?? []),
    vectorBarPlugin(model.bar_width),
  ];
  return config;
}
