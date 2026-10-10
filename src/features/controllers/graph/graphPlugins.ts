import type { Plugin } from 'chart.js';

// A small clearance prevents touching text without dropping otherwise fitting
// labels when the number of digits changes along an axis.
const X_LABEL_SPACING = 2;

/** Fits numeric labels after layout without changing ticks or axis gutters. */
export const numericXLabels: Plugin<'line' | 'scatter' | 'bar'> = {
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
