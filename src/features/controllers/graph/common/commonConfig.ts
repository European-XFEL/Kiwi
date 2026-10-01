import type { ChartConfiguration, Plugin } from 'chart.js';
import type { BasePlotModel } from '@/karabo/common/api';
import { chartAxes } from './axis';
import { GRAPH_COLORS, GRAPH_LAYOUT, type Range } from './constants';

export const plotFrame: Plugin<'line'> = {
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
  model: BasePlotModel,
  logarithmicX: boolean,
  xRange?: Range,
  yRange?: Range,
  beginAtZero = false
): ChartConfiguration<'line'> {
  return {
    type: 'line',
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
          top: model.title ? GRAPH_LAYOUT.titledTop : GRAPH_LAYOUT.insets.top,
          right: GRAPH_LAYOUT.insets.right,
        },
      },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: chartAxes(model, logarithmicX, xRange, yRange, beginAtZero),
    },
  };
}
