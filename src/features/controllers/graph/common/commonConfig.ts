import type { ChartConfiguration } from 'chart.js';
import type { PlotSettings } from './buildModelConfig';
import { GRAPH_LAYOUT } from './constants';
import { plotFrame } from './plotFrame';
import { chartAxes, type PlotAxesConfig } from '../graphAxes';

export function commonChartOption(
  plotConfig: PlotSettings,
  axes: PlotAxesConfig
): ChartConfiguration<'line'>;
export function commonChartOption(
  plotConfig: PlotSettings,
  axes: PlotAxesConfig,
  type: 'scatter'
): ChartConfiguration<'scatter'>;
export function commonChartOption(
  plotConfig: PlotSettings,
  axes: PlotAxesConfig,
  type: 'line' | 'scatter' = 'line'
): ChartConfiguration<'line' | 'scatter'> {
  return {
    type,
    data: { datasets: [{ data: [] }] },
    plugins: [plotFrame],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      parsing: false,
      normalized: true,
      events: [],
      layout: {
        autoPadding: false,
        padding: {
          top: plotConfig.title
            ? GRAPH_LAYOUT.titledTop
            : GRAPH_LAYOUT.insets.top,
          right: GRAPH_LAYOUT.insets.right,
        },
      },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: chartAxes(axes),
    },
  };
}
