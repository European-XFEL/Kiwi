import type { Plugin } from 'chart.js';
import { TRACE_COLORS } from './common/constants';

// A small clearance prevents touching text without dropping otherwise fitting
// labels when the number of digits changes along an axis.
const X_LABEL_SPACING = 2;

/** Fits numeric labels after layout without changing ticks or axis gutters. */
export const numericXLabels: Plugin<'line' | 'scatter'> = {
  id: 'numericXLabels',
  afterLayout(chart) {
    const { ctx, chartArea, scales } = chart;
    const items = scales.x.getLabelItems();
    ctx.save();
    const labels = items
      .map((item) => {
        ctx.font = item.font.string;
        const lines = Array.isArray(item.label) ? item.label : [item.label];
        const width = Math.max(
          0,
          ...lines.map((line) => ctx.measureText(line).width)
        );
        return { item, width, position: item.options.translation![0] };
      })
      .sort((a, b) => a.position - b.position);
    ctx.restore();
    if (labels.length === 0) {
      return;
    }

    let previousRight = chartArea.left - X_LABEL_SPACING;
    labels.forEach(({ item, position, width }) => {
      if (width === 0) {
        return;
      }
      const left = position - width / 2;
      const right = position + width / 2;
      if (
        left < previousRight + X_LABEL_SPACING ||
        left < chartArea.left ||
        right > chartArea.right
      ) {
        item.label = '';
      } else {
        previousRight = right;
      }
    });
  },
};

/** Draws bars in data coordinates so their X width follows zoom. */
export function vectorBarPlugin(width: number): Plugin<'line'> {
  return {
    id: 'vectorBars',
    afterDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      const baseline = scales.y.getPixelForValue(
        scales.y.type === 'logarithmic' ? scales.y.min : 0
      );
      ctx.save();
      ctx.beginPath();
      ctx.rect(
        chartArea.left,
        chartArea.top,
        chartArea.width,
        chartArea.height
      );
      ctx.clip();
      ctx.fillStyle = TRACE_COLORS[0];
      for (const point of chart.data.datasets[0].data) {
        if (typeof point !== 'object' || point === null) continue;
        const { x, y } = point as { x: number; y: number };
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        const left = scales.x.getPixelForValue(x - width / 2);
        const right = scales.x.getPixelForValue(x + width / 2);
        const top = scales.y.getPixelForValue(y);
        if (![left, right, top, baseline].every(Number.isFinite)) continue;
        ctx.fillRect(
          Math.min(left, right),
          Math.min(top, baseline),
          Math.abs(right - left),
          Math.abs(baseline - top)
        );
      }
      ctx.restore();
    },
  };
}
