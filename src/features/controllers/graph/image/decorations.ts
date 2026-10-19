import { type PlotSettings } from '@/karabo/common/api';
import {
  GRAPH_AXIS_FONT,
  axisTitle,
  roundedTickSpacing,
  formatValueTick,
} from '../utils';
import type { AxisRanges, PlotBounds } from '../types';
import type { ImageSize } from './raster';

const WEBCAM_PLACEHOLDER_FONT_SIZE_PX = 72;
const WEBCAM_PLACEHOLDER_TEXT_PADDING_PX = 20;

export function imageBounds(
  size: ImageSize,
  color: boolean,
  imageOnly = false
): PlotBounds {
  if (imageOnly) {
    return { left: 0, right: size.width, top: 0, bottom: size.height };
  }
  // Fixed gutters keep the plot stationary as tick strings change during zoom.
  // Grayscale reserves space at the right for its colorbar; packed color omits it.
  return {
    left: 72,
    right: Math.max(72, size.width - (color ? 12 : 88)),
    top: 52,
    bottom: Math.max(52, size.height - 20),
  };
}

function drawAxis(
  ctx: CanvasRenderingContext2D,
  {
    min,
    max,
    start,
    end,
    edge,
    opposite,
    vertical,
  }: {
    min: number;
    max: number;
    start: number;
    end: number;
    edge: number;
    opposite: number;
    vertical: boolean;
  }
) {
  const span = Math.abs(max - min);
  if (!Number.isFinite(span) || span === 0) {
    return;
  }
  const target = span / Math.max(2, Math.abs(end - start) / 65);
  // Share the graph axes' 1/2/5 major spacing, with five minor intervals per major step.
  const step = roundedTickSpacing(target);
  const minor = step / 5;
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  const first = Math.ceil(low / minor);
  const count = Math.min(500, Math.floor(high / minor) - first + 1);
  for (let i = 0; i < count; i++) {
    const index = first + i;
    const value = index * minor;
    // The signed denominator also handles negative calibration scales without flipping bounds.
    const position = start + ((value - min) / (max - min)) * (end - start);
    const major = index % 5 === 0;
    const tick = major ? 6 : 3;
    ctx.beginPath();
    if (vertical) {
      ctx.moveTo(edge, position);
      ctx.lineTo(edge + tick, position);
      ctx.moveTo(opposite, position);
      ctx.lineTo(opposite - tick, position);
    } else {
      ctx.moveTo(position, edge);
      ctx.lineTo(position, edge + tick);
      ctx.moveTo(position, opposite);
      ctx.lineTo(position, opposite - tick);
    }
    ctx.stroke();
    if (!major) {
      continue;
    }
    const label = formatValueTick(value, step);
    if (vertical) {
      ctx.textAlign = 'right';
      ctx.fillText(label, edge - 7, position, 45);
    } else {
      ctx.textAlign = 'center';
      const half = ctx.measureText(label).width / 2;
      // Keep endpoint labels inside the plot without changing its fixed gutters.
      ctx.fillText(
        label,
        Math.max(start + half, Math.min(end - half, position)),
        edge - 10
      );
    }
  }
}

export function drawImageDecorations(
  ctx: CanvasRenderingContext2D,
  {
    plotConfig,
    ranges,
    bounds,
    placeholder,
    imageOnly = false,
  }: {
    plotConfig: PlotSettings;
    ranges: AxisRanges;
    bounds: PlotBounds;
    placeholder?: string;
    imageOnly?: boolean;
  }
) {
  const { left, right, top, bottom } = bounds;
  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) {
    return;
  }
  if (imageOnly) {
    if (placeholder) {
      ctx.save();
      ctx.fillStyle = '#000';
      ctx.fillRect(left, top, width, height);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${WEBCAM_PLACEHOLDER_FONT_SIZE_PX}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        placeholder,
        left + width / 2,
        top + height / 2,
        width - 2 * WEBCAM_PLACEHOLDER_TEXT_PADDING_PX
      );
      ctx.restore();
    }
    return;
  }
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#000';
  ctx.lineWidth = 1;
  ctx.font = `${GRAPH_AXIS_FONT.size}px ${GRAPH_AXIS_FONT.family}`;
  ctx.textBaseline = 'middle';
  ctx.strokeRect(left, top, width, height);
  // Calibration affects displayed axis values; navigation and raster crops stay in pixels.
  drawAxis(ctx, {
    min: ranges.x[0] * plotConfig.x_scale + plotConfig.x_translate,
    max: ranges.x[1] * plotConfig.x_scale + plotConfig.x_translate,
    start: left,
    end: right,
    edge: top,
    opposite: bottom,
    vertical: false,
  });
  drawAxis(ctx, {
    min: ranges.y[0] * plotConfig.y_scale + plotConfig.y_translate,
    max: ranges.y[1] * plotConfig.y_scale + plotConfig.y_translate,
    start: top,
    end: bottom,
    edge: left,
    opposite: right,
    vertical: true,
  });
  ctx.textAlign = 'center';
  ctx.fillText(
    axisTitle(plotConfig.x_label, plotConfig.x_units),
    left + width / 2,
    12,
    width
  );
  ctx.save();
  ctx.translate(10, top + height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(axisTitle(plotConfig.y_label, plotConfig.y_units), 0, 0, height);
  ctx.restore();
  if (plotConfig.show_scale && !placeholder) {
    const lines = [
      'Scale',
      `x: ${formatValueTick(plotConfig.x_scale)} ${plotConfig.x_units}`,
      `y: ${formatValueTick(plotConfig.y_scale)} ${plotConfig.y_units}`,
    ];
    const boxWidth = Math.min(
      width,
      Math.max(...lines.map((line) => ctx.measureText(line).width)) + 12
    );
    ctx.fillStyle = '#ffffffb3';
    ctx.fillRect(left + 5, bottom - 58, boxWidth, 53);
    ctx.strokeRect(left + 5, bottom - 58, boxWidth, 53);
    ctx.fillStyle = '#000';
    ctx.textAlign = 'left';
    lines.forEach((line, i) =>
      ctx.fillText(line, left + 10, bottom - 47 + i * 16, boxWidth - 10)
    );
  }
  if (placeholder) {
    // Paint last so missing-image text covers the plot interior while axes remain visible.
    ctx.fillStyle = '#000';
    ctx.fillRect(left, top, width, height);
    ctx.fillStyle = '#fff';
    ctx.font = `bold 24px ${GRAPH_AXIS_FONT.family}`;
    ctx.textAlign = 'center';
    ctx.fillText(placeholder, left + width / 2, top + height / 2, width - 16);
  }
  ctx.restore();
}
