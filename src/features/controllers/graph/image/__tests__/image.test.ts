import { Encoding, HashType, Timestamp } from '@/karabo/data/api';
import { BaseBinding, ImageBinding, NodeBinding } from '@/lib/binding/api';
import {
  byteScale,
  getFrame,
  getImageTimestamp,
  hasImageData,
} from '../pixels';
import { getColormap } from '../colormaps';

function image(
  data: ArrayBufferView = new Uint8Array([0, 255]),
  type = HashType.UInt8,
  dims: number[] | bigint[] = [1, 2],
  encoding = Encoding.GRAY
) {
  const binding = new ImageBinding();
  const pixels = new NodeBinding();
  pixels.value.set(
    'data',
    new BaseBinding({
      value: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    })
  );
  pixels.value.set('type', new BaseBinding({ value: type }));
  binding.value.set('pixels', pixels);
  binding.value.set('dims', new BaseBinding({ value: dims }));
  const encodingBinding = new BaseBinding();
  encodingBinding.setValue(encoding, undefined);
  binding.value.set('encoding', encodingBinding);
  return binding;
}

test('distinguishes an uninitialized image from populated unsupported data', () => {
  const binding = new ImageBinding();
  expect(hasImageData(binding)).toBe(false);
  const pixels = new NodeBinding();
  binding.value.set('pixels', pixels);
  expect(hasImageData(binding)).toBe(false);
  const data = new BaseBinding();
  pixels.value.set('data', data);
  expect(hasImageData(binding)).toBe(false);
  data.setValue(new Uint8Array(), undefined);
  expect(hasImageData(binding)).toBe(false);
  const unsupported = image(undefined, undefined, [1, 2], Encoding.JPEG);
  expect(hasImageData(unsupported)).toBe(true);
  expect(getFrame(unsupported, 'none')).toBeUndefined();
  expect(hasImageData(image())).toBe(true);
});

test('reads the image node timestamp and ignores empty payloads', () => {
  const binding = image();
  const pixels: NodeBinding = binding.value.get('pixels');
  const timestamp = new Timestamp(123);
  pixels.value.get('data').timestamp = new Timestamp(456);
  expect(binding.timestamp).toBeUndefined();
  binding.bindingUpdated(timestamp);
  expect(getImageTimestamp(binding)).toBe(timestamp);
  expect(getImageTimestamp(new ImageBinding())).toBeUndefined();
  const empty = image(new Uint8Array());
  empty.bindingUpdated(timestamp);
  expect(getImageTimestamp(empty)).toBeUndefined();
});

test('normalizes grayscale, constant and nonfinite samples', () => {
  expect(
    getFrame(
      image(
        new Float64Array([-2, 0, 2, NaN, Infinity]),
        HashType.Double,
        [1, 5]
      ),
      'none'
    )?.pixels
  ).toEqual(
    new Uint8ClampedArray([
      0, 0, 0, 255, 128, 128, 128, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0,
      0,
    ])
  );
  expect(getFrame(image(new Uint8Array([7, 7])), 'unknown')?.pixels).toEqual(
    new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255])
  );
  expect(
    getFrame(image(new Float64Array([-1e308, 1e308]), HashType.Double), 'none')
      ?.pixels[4]
  ).toBe(255);
});

test('byteScale ignores nonfinite extrema and handles constant integer samples', () => {
  const scale = byteScale(new Float64Array([NaN, -10, 0, 10, Infinity]));
  expect([-10, 0, 10].map(scale)).toEqual([0, 128, 255]);
  expect(scale(NaN)).toBeUndefined();
  expect(scale(Infinity)).toBeUndefined();
  expect(byteScale(new BigInt64Array([7n, 7n]))(7n)).toBe(0);
  expect(
    getFrame(image(new Float64Array([NaN, Infinity]), HashType.Double), 'none')
      ?.pixels
  ).toEqual(new Uint8ClampedArray(8));
});

test('reuses output storage and clears previous colors for nonfinite samples', () => {
  const buffer = getFrame(image(), 'none')!.pixels;
  expect(buffer[7]).toBe(255);
  const frame = getFrame(
    image(new Float64Array([NaN, Infinity]), HashType.Double),
    'none',
    buffer
  );
  expect(frame?.pixels).toBe(buffer);
  expect(buffer).toEqual(new Uint8ClampedArray(8));
  const recovered = getFrame(image(), 'viridis', buffer);
  expect(recovered?.pixels).toBe(buffer);
  expect(buffer).toEqual(getFrame(image(), 'viridis')!.pixels);
});

test('reuses matching storage and reallocates when the pixel count changes', () => {
  const landscape = getFrame(image(), 'none')!;
  const buffer = landscape.pixels;
  expect([landscape.width, landscape.height]).toEqual([2, 1]);
  const portrait = getFrame(
    image(undefined, undefined, [2, 1]),
    'none',
    buffer
  )!;
  expect([portrait.width, portrait.height]).toEqual([1, 2]);
  expect(portrait.pixels).toBe(buffer);
  const resized = getFrame(
    image(new Uint8Array([7]), undefined, [1, 1]),
    'none',
    buffer
  )!;
  expect([resized.width, resized.height]).toEqual([1, 1]);
  expect(resized.pixels).not.toBe(buffer);
  expect(resized.pixels).toEqual(new Uint8ClampedArray([0, 0, 0, 255]));
  const previous = buffer.slice();
  expect(
    getFrame(image(undefined, undefined, [1, 2], Encoding.JPEG), 'none', buffer)
  ).toBeUndefined();
  expect(buffer).toEqual(previous);
});

test.each([HashType.Int64, HashType.UInt64])(
  'preserves adjacent 64-bit values for type %s',
  (type) => {
    const data =
      type === HashType.Int64
        ? new BigInt64Array([-9007199254740995n, -9007199254740994n])
        : new BigUint64Array([18446744073709551614n, 18446744073709551615n]);
    expect(getFrame(image(data, type), 'none')?.pixels).toEqual(
      new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255])
    );
  }
);

test.each([
  ['jet', [0, 0, 128], [128, 0, 0]],
  ['viridis', [68, 1, 84], [253, 231, 37]],
  ['inferno', [0, 0, 4], [252, 255, 164]],
  ['plasma', [13, 8, 135], [240, 249, 33]],
  ['magma', [0, 0, 4], [252, 253, 191]],
])('uses cached %s endpoints', (name, first, last) => {
  const palette = getColormap(name as string);
  expect(palette).toBe(getColormap(name as string));
  expect(palette.slice(0, 3)).toEqual(first);
  expect(palette.slice(-3)).toEqual(last);
  expect(Array.from(getFrame(image(), name as string)!.pixels)).toEqual([
    ...(first as number[]),
    255,
    ...(last as number[]),
    255,
  ]);
});

test.each([Encoding.RGB, Encoding.RGBA, Encoding.BGR, Encoding.BGRA])(
  'orders color channels and preserves alpha for %s',
  (encoding) => {
    const alpha = encoding === Encoding.RGBA || encoding === Encoding.BGRA;
    const reverse = encoding === Encoding.BGR || encoding === Encoding.BGRA;
    const data = new Uint8Array(alpha ? [10, 20, 30, 40] : [10, 20, 30]);
    const buffer = new Uint8ClampedArray(4).fill(255);
    const frame = getFrame(
      image(data, HashType.UInt8, [1, 1, data.length], encoding),
      'viridis',
      buffer
    );
    expect(frame?.pixels).toBe(buffer);
    expect(frame?.pixels).toEqual(
      new Uint8ClampedArray(
        reverse
          ? [30, 20, 10, alpha ? 40 : 255]
          : [10, 20, 30, alpha ? 40 : 255]
      )
    );
  }
);

test('returns undefined for missing frames and supports single channel', () => {
  expect(
    getFrame(image(undefined, undefined, [1, 2, 1]), 'none')
  ).toBeDefined();
  for (const binding of [new ImageBinding(), image(new Uint8Array())]) {
    expect(getFrame(binding, 'none')).toBeUndefined();
  }
});

test('returns undefined for incomplete pixel samples', () => {
  expect(
    getFrame(image(new Uint8Array([1]), HashType.Int32, [1, 1]), 'none')
  ).toBeUndefined();
});

test.each([
  [
    'Image has improper shape',
    image(undefined, undefined, [1n, 9007199254740993n]),
  ],
  ['Image has improper shape', image(undefined, undefined, [2, 2])],
  ['Unsupported image pixel type', image(undefined, HashType.String)],
] as const)('returns undefined for invalid frames: %s', (_message, binding) => {
  expect(getFrame(binding, 'none')).toBeUndefined();
});

test('returns undefined for unsupported encodings and channel mismatches', () => {
  for (const binding of [
    image(undefined, undefined, [1, 2], Encoding.JPEG),
    image(undefined, undefined, [1, 2], Encoding.RGB),
    image(undefined, undefined, [1, 1, 2]),
    image(new Uint16Array([1, 2, 3]), HashType.UInt16, [1, 1, 3], Encoding.RGB),
    image(new Uint8Array([1, 2, 3]), HashType.UInt8, [1, 1, 3], Encoding.RGBA),
  ]) {
    expect(getFrame(binding, 'none')).toBeUndefined();
  }
  // A subsequent valid frame can render without retaining the placeholder.
  const binding = image(undefined, undefined, [1, 2], Encoding.JPEG);
  binding.value.get('encoding')!.setValue(Encoding.GRAY, undefined);
  expect(getFrame(binding, 'none')?.pixels).toHaveLength(8);
});
