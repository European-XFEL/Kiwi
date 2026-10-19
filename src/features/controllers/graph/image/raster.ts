import { Encoding } from '@/karabo/data/api';
import type { NumericVectorTypes } from '@/karabo/data/types';
import type { ImageBinding } from '@/lib/binding/api';
import { getDimensionsAndEncoding, getImageData } from '../../utils/arrays';
import type { AxisRanges } from '../types';
import { getColormap } from './colormaps';

export type ImageSource = {
  data: NumericVectorTypes;
  width: number;
  height: number;
  channels: number;
  encoding: Encoding;
  color: boolean;
};
export type ImageLimits = [number, number] | [bigint, bigint];
export type ImageSize = { width: number; height: number };
type ImageCrop = ImageSize & { x: number; y: number };

// Cap automatic contrast estimation at 65,536 samples to bound work on large frames.
const SAMPLE_LIMIT = 65536;
// Extend the crop by 10% of the visible span on each side, within source bounds.
// The image layer clips this margin; navigation currently regenerates the raster.
const OVERSCAN = 0.1;

/** Decode a view of the source, without allocating a full-resolution raster. */
export function readImageSource(
  binding: ImageBinding
): ImageSource | undefined {
  const [width, height, channels, encoding] = getDimensionsAndEncoding(binding);
  const frame = getImageData({ imageNode: binding, width, height, channels });
  if (!frame || !width || !height) {
    return undefined;
  }
  const gray =
    encoding === Encoding.GRAY && (channels === undefined || channels === 1);
  const rgb = encoding === Encoding.RGB || encoding === Encoding.BGR;
  const rgba = encoding === Encoding.RGBA || encoding === Encoding.BGRA;
  // Packed color channels are already bytes; grayscale takes the intensity scaling path.
  const color =
    frame.data instanceof Uint8Array &&
    ((rgb && channels === 3) || (rgba && channels === 4));
  if (!gray && !color) {
    return undefined;
  }
  return {
    data: frame.data,
    width,
    height,
    channels: channels ?? 1,
    encoding: encoding!,
    color,
  };
}

/** Double the sampling stride along both axes until the sample count fits the limit. */
export function sampleLimits({
  data,
  width,
  height,
}: ImageSource): ImageLimits {
  let stride = 1;
  while (
    Math.ceil(width / stride) * Math.ceil(height / stride) >
    SAMPLE_LIMIT
  ) {
    stride *= 2;
  }
  let min: number | bigint = Infinity;
  let max: number | bigint = -Infinity;
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const value = data[y * width + x];
      if (typeof value === 'number' && !Number.isFinite(value)) {
        continue;
      }
      if (value < min) {
        min = value;
      }
      if (value > max) {
        max = value;
      }
    }
  }
  // No finite samples still need a usable colorbar; invalid pixels stay transparent.
  return min <= max ? ([min, max] as ImageLimits) : [0, 255];
}

/** Map source intensities to clipped bytes; nonfinite samples stay transparent. */
function createByteScale([min, max]: ImageLimits, data: NumericVectorTypes) {
  const floating = data instanceof Float32Array || data instanceof Float64Array;
  if (min === max) {
    if (!floating) {
      return () => 0;
    }
    return (value: number | bigint) => (Number.isFinite(value) ? 0 : NaN);
  }
  const bigint =
    data instanceof BigInt64Array || data instanceof BigUint64Array;
  const integer = typeof min === 'bigint' && typeof max === 'bigint';
  // Subtract integer limits before converting to Number to retain small 64-bit differences.
  const range = integer ? Number(max - min) : Number(max) - Number(min);
  if (integer && bigint) {
    return (value: number | bigint) =>
      Math.max(
        0,
        Math.min(
          255,
          Math.round((Number((value as bigint) - min) / range) * 255)
        )
      );
  }
  const minimum = Number(min);
  let scale: (value: number | bigint) => number;
  if (Number.isFinite(range)) {
    scale = (value) =>
      Math.max(
        0,
        Math.min(255, Math.round((((value as number) - minimum) / range) * 255))
      );
  } else {
    const maximum = Number(max);
    const magnitude = Math.max(Math.abs(minimum), Math.abs(maximum));
    const scaledMinimum = minimum / magnitude;
    const scaledRange = maximum / magnitude - scaledMinimum;
    // Opposite finite extremes can overflow their difference; normalize before subtracting.
    scale = (value) =>
      Math.max(
        0,
        Math.min(
          255,
          Math.round(
            (((value as number) / magnitude - scaledMinimum) / scaledRange) *
              255
          )
        )
      );
  }
  // Only float storage can contain nonfinite samples; integer pixels need no per-pixel check.
  if (floating) {
    return (value: number | bigint) =>
      Number.isFinite(value) ? scale(value) : NaN;
  }
  if (bigint) {
    return (value: number | bigint) => scale(Number(value));
  }
  return scale;
}

function cropToViewport({
  source,
  ranges,
}: {
  source: ImageSize;
  ranges: AxisRanges;
}): ImageCrop {
  const xSpan = ranges.x[1] - ranges.x[0];
  const ySpan = ranges.y[1] - ranges.y[0];
  // Include a 10% margin on each side, then clamp to valid integer source-pixel bounds.
  const x = Math.max(
    0,
    Math.min(source.width, Math.floor(ranges.x[0] - xSpan * OVERSCAN))
  );
  const y = Math.max(
    0,
    Math.min(source.height, Math.floor(ranges.y[0] - ySpan * OVERSCAN))
  );
  const right = Math.max(
    x,
    Math.min(source.width, Math.ceil(ranges.x[1] + xSpan * OVERSCAN))
  );
  const bottom = Math.max(
    y,
    Math.min(source.height, Math.ceil(ranges.y[1] + ySpan * OVERSCAN))
  );
  return { x, y, width: right - x, height: bottom - y };
}

/** Match the displayed resolution, retaining every source pixel when magnified. */
function getDownsampledSize({
  crop,
  ranges,
  size,
}: {
  crop: ImageCrop;
  ranges: AxisRanges;
  size: ImageSize;
}): ImageSize {
  const xSpan = ranges.x[1] - ranges.x[0];
  const ySpan = ranges.y[1] - ranges.y[0];
  const width = Math.min(
    crop.width,
    Math.max(0, Math.ceil((crop.width / xSpan) * size.width))
  );
  const height = Math.min(
    crop.height,
    Math.max(0, Math.ceil((crop.height / ySpan) * size.height))
  );
  return { width, height };
}

function downsampleColor({
  source,
  crop,
  size,
  pixels,
}: {
  source: ImageSource;
  crop: ImageCrop;
  size: ImageSize;
  pixels: Uint8ClampedArray;
}) {
  const { width, height } = size;
  const { data, channels, width: sourceWidth } = source;
  const reversed =
    source.encoding === Encoding.BGR || source.encoding === Encoding.BGRA;
  const red = reversed ? 2 : 0;
  const blue = reversed ? 0 : 2;
  const xStep = width > 1 ? (crop.width - 1) / (width - 1) : 0;
  const yStep = height > 1 ? (crop.height - 1) / (height - 1) : 0;
  for (let row = 0; row < height; row++) {
    const sourceRow = (crop.y + Math.round(row * yStep)) * sourceWidth;
    for (let column = 0; column < width; column++) {
      const sourceIndex =
        (sourceRow + crop.x + Math.round(column * xStep)) * channels;
      const targetIndex = (row * width + column) * 4;
      // Canvas expects RGBA: swap BGR red/blue channels and supply opaque alpha for RGB.
      pixels[targetIndex] = Number(data[sourceIndex + red]);
      pixels[targetIndex + 1] = Number(data[sourceIndex + 1]);
      pixels[targetIndex + 2] = Number(data[sourceIndex + blue]);
      pixels[targetIndex + 3] =
        channels === 4 ? Number(data[sourceIndex + 3]) : 255;
    }
  }
}

/** Keep color copying separate from grayscale downsampling, bytescaling, and palette lookup. */
function downsampleToRgba({
  source,
  crop,
  size,
  colormap,
  limits,
  buffer,
}: {
  source: ImageSource;
  crop: ImageCrop;
  size: ImageSize;
  colormap: string;
  limits: ImageLimits;
  buffer?: Uint8ClampedArray;
}) {
  const { width, height } = size;
  const length = width * height * 4;
  // ImageData storage can be reused whenever the required RGBA byte count matches.
  const pixels =
    buffer?.length === length ? buffer : new Uint8ClampedArray(length);
  if (length === 0) {
    return pixels;
  }
  if (source.color) {
    downsampleColor({ source, crop, size, pixels });
    return pixels;
  }
  const { rgba: palette } = getColormap(colormap);
  const { data, channels, width: sourceWidth } = source;
  // The output is ImageData storage or a newly allocated, aligned RGBA buffer.
  const packedPixels = new Uint32Array(
    pixels.buffer,
    pixels.byteOffset,
    length / 4
  );
  const byteScale = createByteScale(limits, data);
  // Downsample by selecting nearest source pixels across the crop endpoints.
  // Convert directly into the reusable RGBA output without intermediate images.
  const xStep = width > 1 ? (crop.width - 1) / (width - 1) : 0;
  const yStep = height > 1 ? (crop.height - 1) / (height - 1) : 0;
  for (let row = 0; row < height; row++) {
    const sourceY = crop.y + Math.round(row * yStep);
    const sourceRow = sourceY * sourceWidth;
    for (let column = 0; column < width; column++) {
      const sourceX = crop.x + Math.round(column * xStep);
      const sourceIndex = (sourceRow + sourceX) * channels;
      const targetIndex = row * width + column;
      // Bytescale the selected grayscale sample, then apply the palette.
      const intensity = byteScale(data[sourceIndex]);
      if (!Number.isFinite(intensity)) {
        // Clear invalid samples, including alpha, when reusing a previous frame's buffer.
        packedPixels[targetIndex] = 0;
        continue;
      }
      packedPixels[targetIndex] = palette[intensity];
    }
  }
  return pixels;
}

/** Crop the viewport, choose the raster resolution, and convert sampled pixels. */
export function rasterize({
  source,
  ranges,
  size,
  colormap,
  limits,
  buffer,
}: {
  source: ImageSource;
  ranges: AxisRanges;
  size: ImageSize;
  colormap: string;
  limits: ImageLimits;
  buffer?: Uint8ClampedArray;
}) {
  const crop = cropToViewport({ source, ranges });
  const outputSize = getDownsampledSize({ crop, ranges, size });
  const pixels = downsampleToRgba({
    source,
    crop,
    size: outputSize,
    colormap,
    limits,
    buffer,
  });
  return { ...outputSize, pixels, crop };
}
