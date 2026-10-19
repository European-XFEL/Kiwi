import { Encoding, HashType, Timestamp } from '@/karabo/data/api';
import { BaseBinding, ImageBinding, NodeBinding } from '@/lib/binding/api';
import { getImageTimestamp, hasImageData } from '../pixels';
import { rasterize, readImageSource, sampleLimits } from '../raster';
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

// Render a full-size fixture through the same pipeline used by the image views.
function renderFrame(
  binding: ImageBinding,
  colormap: string,
  buffer?: Uint8ClampedArray
) {
  const source = readImageSource(binding);
  if (!source) {
    return undefined;
  }
  return rasterize({
    source,
    ranges: { x: [0, source.width], y: [0, source.height] },
    size: source,
    colormap,
    limits: source.color ? [0, 255] : sampleLimits(source),
    buffer,
  });
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
  expect(renderFrame(unsupported, 'none')).toBeUndefined();
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
    renderFrame(
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
  expect(renderFrame(image(new Uint8Array([7, 7])), 'unknown')?.pixels).toEqual(
    new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255])
  );
  expect(
    renderFrame(
      image(new Float64Array([-1e308, 1e308]), HashType.Double),
      'none'
    )?.pixels[4]
  ).toBe(255);
});

test('handles constant integer frames and frames without finite samples', () => {
  expect(
    renderFrame(image(new BigInt64Array([7n, 7n]), HashType.Int64), 'none')
      ?.pixels
  ).toEqual(new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255]));
  expect(
    renderFrame(
      image(new Float64Array([NaN, Infinity]), HashType.Double),
      'none'
    )?.pixels
  ).toEqual(new Uint8ClampedArray(8));
});

test('reuses output storage and clears previous colors for nonfinite samples', () => {
  const buffer = renderFrame(image(), 'none')!.pixels;
  expect(buffer[7]).toBe(255);
  const frame = renderFrame(
    image(new Float64Array([NaN, Infinity]), HashType.Double),
    'none',
    buffer
  );
  expect(frame?.pixels).toBe(buffer);
  expect(buffer).toEqual(new Uint8ClampedArray(8));
  const recovered = renderFrame(image(), 'viridis', buffer);
  expect(recovered?.pixels).toBe(buffer);
  expect(buffer).toEqual(renderFrame(image(), 'viridis')!.pixels);
});

test('reuses matching storage and reallocates when the pixel count changes', () => {
  const landscape = renderFrame(image(), 'none')!;
  const buffer = landscape.pixels;
  expect([landscape.width, landscape.height]).toEqual([2, 1]);
  const portrait = renderFrame(
    image(undefined, undefined, [2, 1]),
    'none',
    buffer
  )!;
  expect([portrait.width, portrait.height]).toEqual([1, 2]);
  expect(portrait.pixels).toBe(buffer);
  const resized = renderFrame(
    image(new Uint8Array([7]), undefined, [1, 1]),
    'none',
    buffer
  )!;
  expect([resized.width, resized.height]).toEqual([1, 1]);
  expect(resized.pixels).not.toBe(buffer);
  expect(resized.pixels).toEqual(new Uint8ClampedArray([0, 0, 0, 255]));
  const previous = buffer.slice();
  expect(
    renderFrame(
      image(undefined, undefined, [1, 2], Encoding.JPEG),
      'none',
      buffer
    )
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
    expect(renderFrame(image(data, type), 'none')?.pixels).toEqual(
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
  expect(palette.rgba).toBeInstanceOf(Uint32Array);
  expect(palette.bytes).toBeInstanceOf(Uint8ClampedArray);
  expect(palette.rgba.buffer).toBe(palette.bytes.buffer);
  expect(Array.from(palette.bytes.slice(0, 4))).toEqual([
    ...(first as number[]),
    255,
  ]);
  expect(Array.from(palette.bytes.slice(-4))).toEqual([
    ...(last as number[]),
    255,
  ]);
  expect(Array.from(new Uint8Array(palette.rgba.buffer))).toEqual(
    Array.from(palette.bytes)
  );
  expect(palette.bytes).toHaveLength(256 * 4);
  expect(palette.bytes.filter((_, i) => i % 4 === 3)).toEqual(
    new Uint8ClampedArray(256).fill(255)
  );
  expect(Array.from(renderFrame(image(), name as string)!.pixels)).toEqual([
    ...(first as number[]),
    255,
    ...(last as number[]),
    255,
  ]);
});

test('shares the grayscale colormap and its packed representation for unknown names', () => {
  const palette = getColormap('none');
  expect(getColormap('unknown')).toBe(palette);
  expect(Array.from(new Uint8Array(palette.rgba.buffer).slice(0, 4))).toEqual([
    0, 0, 0, 255,
  ]);
});

test.each([Encoding.RGB, Encoding.RGBA, Encoding.BGR, Encoding.BGRA])(
  'orders color channels and preserves alpha for %s',
  (encoding) => {
    const alpha = encoding === Encoding.RGBA || encoding === Encoding.BGRA;
    const reverse = encoding === Encoding.BGR || encoding === Encoding.BGRA;
    const data = new Uint8Array(alpha ? [10, 20, 30, 40] : [10, 20, 30]);
    const buffer = new Uint8ClampedArray(4).fill(255);
    const frame = renderFrame(
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
    renderFrame(image(undefined, undefined, [1, 2, 1]), 'none')
  ).toBeDefined();
  for (const binding of [new ImageBinding(), image(new Uint8Array())]) {
    expect(renderFrame(binding, 'none')).toBeUndefined();
  }
});

test('returns undefined for incomplete pixel samples', () => {
  expect(
    renderFrame(image(new Uint8Array([1]), HashType.Int32, [1, 1]), 'none')
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
  expect(renderFrame(binding, 'none')).toBeUndefined();
});

test('returns undefined for unsupported encodings and channel mismatches', () => {
  for (const binding of [
    image(undefined, undefined, [1, 2], Encoding.JPEG),
    image(undefined, undefined, [1, 2], Encoding.RGB),
    image(undefined, undefined, [1, 1, 2]),
    image(new Uint16Array([1, 2, 3]), HashType.UInt16, [1, 1, 3], Encoding.RGB),
    image(new Uint8Array([1, 2, 3]), HashType.UInt8, [1, 1, 3], Encoding.RGBA),
  ]) {
    expect(renderFrame(binding, 'none')).toBeUndefined();
  }
  // A subsequent valid frame can render without retaining the placeholder.
  const binding = image(undefined, undefined, [1, 2], Encoding.JPEG);
  binding.value.get('encoding')!.setValue(Encoding.GRAY, undefined);
  expect(renderFrame(binding, 'none')?.pixels).toHaveLength(8);
});
