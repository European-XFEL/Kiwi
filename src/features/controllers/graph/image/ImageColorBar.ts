import { GRAPH_AXIS_FONT, formatValueTick } from '../utils';
import { getColormap } from './colormaps';
import type { ImageLimits } from './raster';

/** Display-only colorbar; the caller omits it for color encodings. */
export function drawImageColorBar(
  ctx: CanvasRenderingContext2D,
  {
    x,
    top,
    height,
    colormap,
    limits,
  }: {
    x: number;
    top: number;
    height: number;
    colormap: string;
    limits: ImageLimits;
  }
) {
  const width = 14;
  const { bytes: palette } = getColormap(colormap);
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.font = `${GRAPH_AXIS_FONT.size}px ${GRAPH_AXIS_FONT.family}`;
  ctx.textBaseline = 'middle';
  // Use the raster's palette ordering: low intensity at the bottom, high at the top.
  const gradient = ctx.createLinearGradient(0, top + height, 0, top);
  for (let i = 0; i < 256; i++) {
    const offset = i * 4;
    gradient.addColorStop(
      i / 255,
      `rgb(${palette[offset]},${palette[offset + 1]},${palette[offset + 2]})`
    );
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(x, top, width, height);
  ctx.strokeRect(x, top, width, height);
  ctx.fillStyle = '#000';
  ctx.textAlign = 'left';
  for (let i = 0; i <= 5; i++) {
    const y = top + height * (1 - i / 5);
    const value =
      Number(limits[0]) + ((Number(limits[1]) - Number(limits[0])) * i) / 5;
    let label = formatValueTick(value);
    // Keep integer endpoints exact even beyond Number's precision.
    if (i === 0 || i === 5) {
      const endpoint = limits[i === 0 ? 0 : 1];
      label =
        typeof endpoint === 'bigint'
          ? String(endpoint)
          : formatValueTick(endpoint);
    }
    ctx.beginPath();
    ctx.moveTo(x + width, y);
    ctx.lineTo(x + width + 4, y);
    ctx.stroke();
    ctx.fillText(label, x + width + 6, y, 48);
  }
  ctx.restore();
}
