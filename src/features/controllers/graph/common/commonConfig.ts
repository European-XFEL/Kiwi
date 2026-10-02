import type { ChartConfiguration, Plugin } from 'chart.js';
import type { PlotSettings } from './buildModelConfig';
import { chartAxes } from './axis';
import { GRAPH_COLORS, GRAPH_LAYOUT, type Range } from './constants';

export const plotFrame: Plugin<'line' | 'scatter'> = {
  id: 'kiwiPlotFrame',
  beforeDraw(chart) {
    const { left, top, width, height } = chart.chartArea;
    chart.ctx.fillStyle = GRAPH_COLORS.plotBackground;
    chart.ctx.fillRect(left, top, width, height);
  },
  afterDraw(chart) {
    const { left, top, width, height } = chart.chartArea;
    chart.ctx.strokeStyle = GRAPH_COLORS.frame;
    chart.ctx.lineWidth = 1;
    chart.ctx.strokeRect(left, top, width, height);
  },
};

export function commonChartOption(
  plotConfig: PlotSettings,
  logarithmicX: boolean,
  xRange?: Range,
  yRange?: Range,
  beginAtZero?: boolean
): ChartConfiguration<'line'>;
export function commonChartOption(
  plotConfig: PlotSettings,
  logarithmicX: boolean,
  xRange: Range | undefined,
  yRange: Range | undefined,
  beginAtZero: boolean,
  type: 'scatter'
): ChartConfiguration<'scatter'>;
export function commonChartOption(
  plotConfig: PlotSettings,
  logarithmicX: boolean,
  xRange?: Range,
  yRange?: Range,
  beginAtZero = false,
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
      scales: chartAxes(plotConfig, logarithmicX, xRange, yRange, beginAtZero),
    },
  };
}
