import type { Plugin } from 'chart.js';
import { TRACE_COLORS } from './common/api';

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
