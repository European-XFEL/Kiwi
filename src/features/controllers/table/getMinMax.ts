import {
  BaseBinding,
  Int8Binding,
  Int16Binding,
  Int32Binding,
  Int64Binding,
  UInt8Binding,
  UInt16Binding,
  UInt32Binding,
  UInt64Binding,
  FloatBinding,
  DoubleBinding,
} from '@/lib/binding/api';

type Limits = [number | bigint | undefined, number | bigint | undefined];

// Native floating ranges, relative precision, and smallest positive normal values.
const floatPrecision = {
  maximum: 3.4028234663852886e38,
  epsilon: 2 ** -23,
  tiny: 2 ** -126,
};
const doublePrecision = {
  maximum: Number.MAX_VALUE,
  epsilon: Number.EPSILON,
  tiny: 2 ** -1022,
};

// Match classes with instanceof so numeric subclasses keep their native range.
// Keep 64-bit ranges as bigint to preserve every integer at the boundaries.
const nativeLimits = [
  [Int8Binding, [-128, 127]],
  [UInt8Binding, [0, 255]],
  [Int16Binding, [-32768, 32767]],
  [UInt16Binding, [0, 65535]],
  [Int32Binding, [-(2 ** 31), 2 ** 31 - 1]],
  [UInt32Binding, [0, 2 ** 32 - 1]],
  [Int64Binding, [-(1n << 63n), (1n << 63n) - 1n]],
  [UInt64Binding, [0n, (1n << 64n) - 1n]],
  [FloatBinding, [-floatPrecision.maximum, floatPrecision.maximum]],
  [DoubleBinding, [-doublePrecision.maximum, doublePrecision.maximum]],
] as const;

/** Display limits only; this does not change binding validation. */
export function getMinMax(binding: BaseBinding): Limits {
  const limits = nativeLimits.find(
    ([Binding]) => binding instanceof Binding
  )?.[1];
  if (!limits) {
    return [undefined, undefined];
  }
  const [nativeLow, nativeHigh] = limits;
  const adjustExclusive = (value: number | bigint, direction: 1 | -1) => {
    if (binding instanceof FloatBinding || binding instanceof DoubleBinding) {
      const single = binding instanceof FloatBinding;
      const precision = single ? floatPrecision : doublePrecision;
      const { epsilon, tiny } = precision;
      const limit = Number(value);
      // Move toward the interior of the range; tiny also moves a zero bound.
      return (
        limit * (1 + direction * Math.sign(limit) * epsilon) + direction * tiny
      );
    }
    if (typeof nativeLow === 'bigint') {
      return BigInt(value) + BigInt(direction);
    }
    return Number(value) + direction;
  };

  const attributes = binding.attributes;
  let low = attributes.findValue<number | bigint>('minInc') ?? nativeLow;
  let high = attributes.findValue<number | bigint>('maxInc') ?? nativeHigh;
  const lowExclusive = attributes.findValue<number | bigint>('minExc');
  const highExclusive = attributes.findValue<number | bigint>('maxExc');
  // Exclusive schema bounds take precedence over inclusive and native limits.
  // +1 moves the lower bound inward; -1 moves the upper bound inward.
  if (lowExclusive != null) {
    low = adjustExclusive(lowExclusive, 1);
  }
  if (highExclusive != null) {
    high = adjustExclusive(highExclusive, -1);
  }
  return [low, high];
}
