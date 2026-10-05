import type { Plugin } from 'chart.js';
import { GRAPH_COLORS } from './constants';

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
