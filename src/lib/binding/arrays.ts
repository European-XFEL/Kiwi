import { HashType, Timestamp, unwrap } from '@/karabo/data/api';
import type { NumericVectorTypes } from '@/karabo/data/types';
import { BaseBinding, NDArrayBinding, VectorBinding } from './BaseBinding';

const arrayTypes: Partial<
  Record<
    HashType,
    {
      readonly BYTES_PER_ELEMENT: number;
      new (
        buffer: ArrayBufferLike,
        byteOffset: number,
        length: number
      ): NumericVectorTypes;
    }
  >
> = {
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

/** Decode in native byte order, matching karaboGui (ignoring isBigEndian). */
export function decodeArrayData(
  bytes: Uint8Array,
  type: HashType
): NumericVectorTypes | undefined {
  const ArrayType = arrayTypes[type];
  if (!ArrayType) {
    return undefined;
  }

  const { BYTES_PER_ELEMENT: width } = ArrayType;
  const { buffer, byteOffset, byteLength } = bytes;
  if (byteLength % width !== 0) {
    throw new RangeError(
      'Array buffer length must be a multiple of element size'
    );
  }
  if (byteOffset % width === 0) {
    return new ArrayType(buffer, byteOffset, byteLength / width);
  }
  const copy = new Uint8Array(bytes);
  return new ArrayType(copy.buffer, 0, byteLength / width);
}

export function getBindingArrayValue(
  binding: BaseBinding,
  fallback: unknown = undefined
): [unknown, Timestamp | undefined] {
  if (binding instanceof VectorBinding) {
    const value = unwrap(binding.value);
    if (value != null) {
      return [value, binding.timestamp];
    }
  } else if (binding instanceof NDArrayBinding) {
    const node = binding.value;
    const pixels = unwrap(node.get('data')?.value);
    const type = unwrap(node.get('type')?.value);
    if (pixels != null) {
      const data = decodeArrayData(pixels, type);
      if (data !== undefined) {
        return [data, node.get('data')?.timestamp];
      }
    }
  }
  return [fallback, new Timestamp()];
}
