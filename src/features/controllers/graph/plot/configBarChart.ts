import type { ChartConfiguration } from 'chart.js';
import type { PlotSettings } from '../common/api';
import { commonChartOption, type Range } from '../common/api';
import { vectorBarPlugin } from './vectorBarPlugin';

export const BAR_SAMPLE_LIMIT = 3000;

export function barChartOption(
  plotConfig: PlotSettings,
  xRange?: Range,
  yRange?: Range
): ChartConfiguration<'line'> {
  const config = commonChartOption(plotConfig, false, xRange, yRange, true);
  config.data.datasets[0].showLine = false;
  config.data.datasets[0].pointRadius = 0;
  config.plugins = [
    ...(config.plugins ?? []),
    vectorBarPlugin(plotConfig.bar_width),
  ];
  return config;
}
