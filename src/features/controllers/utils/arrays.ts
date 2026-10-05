import { Encoding, Timestamp, unwrap } from '@/karabo/data/api';
import type { NumericVectorTypes } from '@/karabo/data/types';
import { ImageBinding, PropertyProxy } from '@/lib/binding/api';
import { decodeArrayData, getBindingArrayValue } from '@/lib/binding/arrays';

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

export function getImageData(
  imageNode: ImageBinding,
  dimX: number | undefined,
  dimY: number | undefined,
  dimZ: number | undefined
): { data: NumericVectorTypes; shape: number[] } | undefined {
  const pixels = imageNode.value?.get('pixels')?.value;
  const bytes = unwrap(pixels?.get('data')?.value);
  if (bytes == null || bytes.byteLength === 0) {
    return undefined;
  }
  const type = unwrap(pixels?.get('type')?.value);
  const data = decodeArrayData(bytes, type);
  if (data === undefined) {
    throw new Error(`Unsupported image pixel type: ${type}`);
  }

  const shape = dimZ ? [dimY, dimX, dimZ] : [dimY, dimX];
  if (
    shape.some(
      (dim) => dim === undefined || !Number.isSafeInteger(dim) || dim < 0
    ) ||
    shape.reduce<number>((size, dim) => size * (dim ?? 0), 1) !== data.length
  ) {
    throw new Error(
      `Image has improper shape (${dimX}, ${dimY}, ${dimZ}) for size ${data.length}`
    );
  }
  return { data, shape: shape as number[] };
}

function dimensionToNumber(value: number | bigint): number {
  if (
    typeof value === 'bigint' &&
    (value > BigInt(Number.MAX_SAFE_INTEGER) || value < 0n)
  ) {
    throw new RangeError('Image dimension is outside the safe integer range');
  }
  const dimension = Number(value);
  if (!Number.isSafeInteger(dimension) || dimension < 0) {
    throw new RangeError('Image dimension is outside the safe integer range');
  }
  return dimension;
}

export function getDimensionsAndEncoding(
  imageNode: ImageBinding
): [
  number | undefined,
  number | undefined,
  number | undefined,
  Encoding | undefined,
] {
  const dims = unwrap(imageNode.value?.get('dims')?.value);
  let encoding: Encoding | undefined = unwrap(
    imageNode.value?.get('encoding')?.value
  );
  if (dims?.length !== 2 && dims?.length !== 3) {
    return [undefined, undefined, undefined, encoding];
  }
  const dimY = dimensionToNumber(dims[0]);
  const dimX = dimensionToNumber(dims[1]);
  const dimZ = dims.length === 3 ? dimensionToNumber(dims[2]) : undefined;
  if (encoding === Encoding.UNDEFINED) {
    encoding =
      dimZ === 3 ? Encoding.RGB : dimZ === 4 ? Encoding.RGBA : Encoding.GRAY;
  }
  return [dimX, dimY, dimZ, encoding];
}
