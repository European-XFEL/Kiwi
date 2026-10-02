import { isTypedArray } from '@/karabo/data/api';

export type VectorData = ArrayLike<number>;

export function normalizeVector(raw: unknown): VectorData {
  if (!raw) return new Float64Array();
  if (isTypedArray(raw)) {
    if (!(raw instanceof BigInt64Array) && !(raw instanceof BigUint64Array))
      return raw;
  } else if (!Array.isArray(raw)) {
    return new Float64Array();
  }
  const normalized = new Float64Array(raw.length);
  for (let index = 0; index < raw.length; index++) {
    normalized[index] = Number(raw[index]);
  }
  return normalized;
}
