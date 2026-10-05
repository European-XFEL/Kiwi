import { Encoding, HashType, Timestamp } from '@/karabo/data/api';
import type { NumericVectorTypes } from '@/karabo/data/types';
import {
  BaseBinding,
  ImageBinding,
  NDArrayBinding,
  PropertyProxy,
  VectorBinding,
} from '@/lib/binding/api';

type ArrayCtor = {
  readonly BYTES_PER_ELEMENT: number;
  new (
    buffer: ArrayBufferLike,
    byteOffset: number,
    length: number
  ): NumericVectorTypes;
};

const arrayTypes: Partial<Record<HashType, ArrayCtor>> = {
  [HashType.Bool]: Uint8Array,
  [HashType.Char]: Uint8Array,
  [HashType.Int8]: Int8Array,
  [HashType.UInt8]: Uint8Array,
  [HashType.Int16]: Int16Array,
  [HashType.UInt16]: Uint16Array,
  [HashType.Int32]: Int32Array,
  [HashType.UInt32]: Uint32Array,
  [HashType.Int64]: BigInt64Array,
  [HashType.UInt64]: BigUint64Array,
  [HashType.Float]: Float32Array,
  [HashType.Double]: Float64Array,
};

export function decodeArrayData(
  bytes: Uint8Array,
  type: HashType
): NumericVectorTypes | undefined {
  const ArrayType = arrayTypes[type];
  if (!ArrayType) {
    return undefined;
  }

  const width = ArrayType.BYTES_PER_ELEMENT;
  const { buffer, byteOffset, byteLength } = bytes;
  if (byteLength % width !== 0) {
    console.log('Array buffer length must be a multiple of element size');
    return undefined;
  }
  if (byteOffset % width === 0) {
    return new ArrayType(buffer, byteOffset, byteLength / width);
  }

  // Typed array views require aligned offsets; copy unaligned bytes.
  const copy = new Uint8Array(bytes);
  return new ArrayType(copy.buffer, 0, byteLength / width);
}

export function getBindingArrayValue(
  binding: BaseBinding,
  fallback: unknown = undefined
): [unknown, Timestamp | undefined] {
  if (binding instanceof VectorBinding) {
    const value = binding.getValue();
    if (value != null) {
      return [value, binding.timestamp];
    }
  } else if (binding instanceof NDArrayBinding) {
    const node = binding.value;
    const pixels = node.get('data')?.getValue();
    const type = node.get('type')?.getValue();
    if (pixels != null) {
      const data = decodeArrayData(pixels, type);
      if (data !== undefined) {
        return [data, node.get('data')?.timestamp];
      }
    }
  }
  return [fallback, new Timestamp()];
}

export function getArrayData(
  proxy: PropertyProxy | undefined,
  fallback: unknown = undefined
): [unknown, Timestamp | undefined] {
  const binding = proxy?.binding;
  if (!binding) {
    return [fallback, new Timestamp()];
  }
  return getBindingArrayValue(binding, fallback);
}

/** Dimensions must be valid, and their product must match the decoded samples. */
function hasValidImageShape(
  shape: (number | undefined)[],
  sampleCount: number
): shape is number[] {
  let expectedSamples = 1;
  for (const dimension of shape) {
    if (
      dimension === undefined ||
      !Number.isSafeInteger(dimension) ||
      dimension < 0
    ) {
      return false;
    }
    expectedSamples *= dimension;
  }
  return expectedSamples === sampleCount;
}

export function getImageData({
  imageNode,
  width,
  height,
  channels,
}: {
  imageNode: ImageBinding;
  width: number | undefined;
  height: number | undefined;
  channels: number | undefined;
}): { data: NumericVectorTypes; shape: number[] } | undefined {
  const pixels = imageNode.value.get('pixels')?.value;
  const bytes = pixels?.get('data')?.getValue();
  if (bytes == null || bytes.byteLength === 0) {
    return undefined;
  }
  const type = pixels?.get('type')?.getValue();
  const data = decodeArrayData(bytes, type);
  if (data === undefined) {
    return undefined;
  }

  // Row-major order: height, width, and channels when present.
  const shape = channels ? [height, width, channels] : [height, width];
  if (!hasValidImageShape(shape, data.length)) {
    return undefined;
  }
  return { data, shape };
}

export function getDimensionsAndEncoding(
  imageNode: ImageBinding
): [
  width: number | undefined,
  height: number | undefined,
  channels: number | undefined,
  encoding: Encoding | undefined,
] {
  const dimensions = imageNode.value.get('dims')?.getValue();
  let encoding: Encoding | undefined = imageNode.value
    .get('encoding')
    ?.getValue();
  // Missing or stacked dimensions have no supported image geometry.
  if (dimensions?.length !== 2 && dimensions?.length !== 3) {
    return [undefined, undefined, undefined, encoding];
  }
  // Bindings store dimensions in row-major order: height, width, channels.
  const height = Number(dimensions[0]);
  const width = Number(dimensions[1]);
  let channels: number | undefined;
  if (dimensions.length === 3) {
    channels = Number(dimensions[2]);
  }

  // Infer the encoding only when the camera explicitly leaves it undefined.
  // Preserve configured encodings, including ones the renderer cannot display.
  if (encoding === Encoding.UNDEFINED) {
    if (channels === 3) {
      encoding = Encoding.RGB;
    } else if (channels === 4) {
      encoding = Encoding.RGBA;
    } else {
      encoding = Encoding.GRAY;
    }
  }
  return [width, height, channels, encoding];
}
