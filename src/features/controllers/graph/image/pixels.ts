import { Encoding, type Timestamp } from '@/karabo/data/api';
import type { NumericVectorTypes } from '@/karabo/data/types';
import { ImageBinding, type NodeBinding } from '@/lib/binding/api';
import { getDimensionsAndEncoding, getImageData } from '../../api';
import { getColormap } from './colormaps';

type ByteScale = (value: number | bigint) => number | undefined;
const RGBA_CHANNEL_COUNT = 4;

/** A schema creates the image namespace before the first pixel payload arrives. */
export function hasImageData(binding: ImageBinding): boolean {
  const pixels: NodeBinding | undefined = binding.value.get('pixels');
  const data = pixels?.value.get('data')?.getValue();
  return data != null && data.byteLength !== 0;
}

/** Only expose a frame timestamp once its pixel payload has arrived. */
export function getImageTimestamp(
  binding: ImageBinding
): Timestamp | undefined {
  return hasImageData(binding) ? binding.timestamp : undefined;
}

/** Build a frame-local intensity scale. Undefined samples remain transparent. */
export function byteScale(data: NumericVectorTypes): ByteScale {
  if (data instanceof BigInt64Array || data instanceof BigUint64Array) {
    let min = data[0];
    let max = min;
    for (const value of data) {
      if (value < min) {
        min = value;
      }
      if (value > max) {
        max = value;
      }
    }
    const range = Number(max - min);
    // Subtract before converting: adjacent 64-bit samples can round to the
    // same Number, while their integer difference still preserves contrast.
    return (value) => {
      if (typeof value !== 'bigint') {
        // Integer frames only scale integer samples.
        return undefined;
      } else if (range === 0) {
        // A constant frame uses the first palette entry.
        return 0;
      } else {
        return Math.round((Number(value - min) / range) * 255);
      }
    };
  }
  let min = Infinity;
  let max = -Infinity;
  for (const value of data) {
    if (!Number.isFinite(value)) {
      // NaN and infinities must not influence the frame's intensity limits.
      continue;
    }
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  const range = max - min;
  const scale = Math.max(Math.abs(min), Math.abs(max));
  return (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      // Undefined intensity lets the pixel converter render this transparent.
      return undefined;
    } else if (min === max) {
      // Constant frames use the first palette entry without dividing by zero.
      return 0;
    } else if (Number.isFinite(range)) {
      // Map the frame's finite minimum and maximum to 0 and 255.
      return Math.round(((value - min) / range) * 255);
    } else {
      // Opposite finite double extremes can overflow when subtracted. Scaling
      // both endpoints first keeps the fraction finite in that case.
      const fraction =
        (value / scale - min / scale) / (max / scale - min / scale);
      return Math.round(fraction * 255);
    }
  };
}

function grayscalePixels(
  data: NumericVectorTypes,
  colormap: string,
  pixels: Uint8ClampedArray
): void {
  const palette = getColormap(colormap);
  const toByte = byteScale(data);
  for (let i = 0; i < data.length; i++) {
    const intensity = toByte(data[i]);
    const offset = i * RGBA_CHANNEL_COUNT;
    // A reused buffer can contain the previous frame's opaque pixels.
    // clear NaN or Inf
    if (intensity === undefined) {
      pixels.fill(0, offset, offset + RGBA_CHANNEL_COUNT);
      continue;
    }
    const color = intensity * 3;
    pixels[offset] = palette[color];
    pixels[offset + 1] = palette[color + 1];
    pixels[offset + 2] = palette[color + 2];
    pixels[offset + 3] = 255;
  }
}

function colorPixels(
  data: Uint8Array,
  channels: number,
  encoding: Encoding,
  pixels: Uint8ClampedArray
): void {
  const reversed = encoding === Encoding.BGR || encoding === Encoding.BGRA;
  if (encoding === Encoding.RGBA) {
    pixels.set(data);
    return;
  }
  // Color frames bypass intensity scaling and colormaps; only BGR ordering
  // changes. Four-channel images retain the camera's alpha byte.
  for (
    let source = 0, target = 0;
    source < data.length;
    source += channels, target += RGBA_CHANNEL_COUNT
  ) {
    pixels[target] = data[source + (reversed ? 2 : 0)];
    pixels[target + 1] = data[source + 1];
    pixels[target + 2] = data[source + (reversed ? 0 : 2)];
    pixels[target + 3] = channels === 4 ? data[source + 3] : 255;
  }
}

/** Check for pixel data and a two- or three-dimensional image structure. */
function hasImagePayload(binding: ImageBinding): boolean {
  // Image dimensions are [height, width] or [height, width, channels].
  // Native VECTOR_UINT64 values unwrap to BigUint64Array.
  const dims = binding.value.get('dims')?.getValue();
  if (
    (!Array.isArray(dims) && !(dims instanceof BigUint64Array)) ||
    (dims.length !== 2 && dims.length !== 3)
  ) {
    return false;
  }
  const pixels: NodeBinding | undefined = binding.value.get('pixels');
  return Boolean(pixels?.value.get('data')?.getValue());
}

function isSupportedColorFrame(
  data: NumericVectorTypes,
  channels: number | undefined,
  encoding: Encoding | undefined
): data is Uint8Array {
  const rgb = encoding === Encoding.RGB || encoding === Encoding.BGR;
  const rgba = encoding === Encoding.RGBA || encoding === Encoding.BGRA;
  return (
    data instanceof Uint8Array &&
    ((rgb && channels === 3) || (rgba && channels === 4))
  );
}

/** Convert a supported frame to RGBA, reusing matching output storage. */
export function getFrame(
  binding: ImageBinding,
  colormap: string,
  buffer?: Uint8ClampedArray
) {
  if (!hasImagePayload(binding)) {
    return undefined;
  }
  const [width, height, channels, encoding] = getDimensionsAndEncoding(binding);
  const image = getImageData({ imageNode: binding, width, height, channels });
  if (!image) {
    return undefined;
  }
  const { data } = image;
  const gray =
    encoding === Encoding.GRAY && (channels === undefined || channels === 1);
  const color = isSupportedColorFrame(data, channels, encoding);
  if (!gray && !color) {
    return undefined;
  }
  // Validate before allocating or modifying the previous frame's buffer.
  const length = width! * height! * RGBA_CHANNEL_COUNT;
  const pixels =
    buffer?.length === length ? buffer : new Uint8ClampedArray(length);
  if (gray) {
    grayscalePixels(data, colormap, pixels);
  } else if (color) {
    colorPixels(data, channels!, encoding!, pixels);
  }
  return { width: width!, height: height!, pixels };
}
