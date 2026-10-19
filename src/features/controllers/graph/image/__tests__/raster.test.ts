import { Encoding, HashType } from '@/karabo/data/api';
import { BaseBinding, ImageBinding, NodeBinding } from '@/lib/binding/api';
import { readImageSource, sampleLimits, rasterize } from '../raster';
import * as colormaps from '../colormaps';

function source(
  data:
    Uint16Array | Float64Array | BigUint64Array | BigInt64Array | Uint8Array,
  width: number,
  height: number,
  encoding = Encoding.GRAY,
  channels = 1
) {
  const binding = new ImageBinding();
  const pixels = new NodeBinding();
  pixels.value.set(
    'data',
    new BaseBinding({
      value: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    })
  );
  let type = HashType.UInt16;
  if (data instanceof Float64Array) {
    type = HashType.Double;
  }
  if (data instanceof BigUint64Array) {
    type = HashType.UInt64;
  }
  if (data instanceof BigInt64Array) {
    type = HashType.Int64;
  }
  if (data instanceof Uint8Array) {
    type = HashType.UInt8;
  }
  pixels.value.set('type', new BaseBinding({ value: type }));
  binding.value.set('pixels', pixels);
  binding.value.set(
    'dims',
    new BaseBinding({ value: [height, width, channels] })
  );
  const enc = new BaseBinding();
  enc.setValue(encoding, undefined);
  binding.value.set('encoding', enc);
  return readImageSource(binding)!;
}

test('retains source storage and bounds a 4K raster by the displayed resolution', () => {
  const data = new Uint16Array(4096 * 4096);
  const frame = source(data, 4096, 4096);
  expect(frame.data.buffer).toBe(data.buffer);
  const result = rasterize({
    source: frame,
    ranges: { x: [0, 4096], y: [0, 4096] },
    size: { width: 800, height: 600 },
    colormap: 'none',
    limits: [0, 65535],
  });
  expect([result.width, result.height]).toEqual([800, 600]);
});

test('crops with ten percent overscan and recovers each source pixel when magnified', () => {
  const frame = source(
    Uint16Array.from({ length: 10000 }, (_, i) => i),
    100,
    100
  );
  const result = rasterize({
    source: frame,
    ranges: { x: [40, 50], y: [40, 50] },
    size: { width: 800, height: 600 },
    colormap: 'none',
    limits: [0, 9999],
  });
  expect(result.crop).toEqual({ x: 39, y: 39, width: 12, height: 12 });
  expect([result.width, result.height]).toEqual([12, 12]);
  expect(result.pixels[0]).toBe(Math.round((3939 / 9999) * 255));
  expect(result.pixels.at(-4)).toBe(Math.round((5050 / 9999) * 255));
});

test('uses nearest neighbors, clips fixed levels, and reuses the output buffer', () => {
  const frame = source(new Uint16Array([0, 10, 20, 30, 40, 50, 60, 70]), 4, 2);
  const args = {
    source: frame,
    ranges: { x: [0, 4] as [number, number], y: [0, 2] as [number, number] },
    size: { width: 2, height: 2 },
    colormap: 'none',
    limits: [10, 50] as [number, number],
  };
  const result = rasterize(args);
  expect(Array.from(result.pixels)).toEqual([
    0, 0, 0, 255, 128, 128, 128, 255, 191, 191, 191, 255, 255, 255, 255, 255,
  ]);
  expect(rasterize({ ...args, buffer: result.pixels }).pixels).toBe(
    result.pixels
  );
});

test('samples by repeated two-axis decimation and ignores nonfinite values', () => {
  const data = new Float64Array(1024 * 1024).fill(7);
  data[0] = NaN;
  data[1] = 1000; // discarded by the first decimation
  data[4] = 2;
  data[8] = 12;
  expect(sampleLimits(source(data, 1024, 1024))).toEqual([2, 12]);
});

test('preserves adjacent uint64 contrast and clears nonfinite pixels', () => {
  const frame = source(
    new BigUint64Array([18446744073709551614n, 18446744073709551615n]),
    2,
    1
  );
  const args = {
    ranges: { x: [0, 2] as [number, number], y: [0, 1] as [number, number] },
    size: { width: 2, height: 1 },
    colormap: 'none',
  };
  const result = rasterize({
    ...args,
    source: frame,
    limits: sampleLimits(frame),
  });
  expect(Array.from(result.pixels)).toEqual([0, 0, 0, 255, 255, 255, 255, 255]);
  const invalid = source(new Float64Array([NaN, Infinity]), 2, 1);
  expect(sampleLimits(invalid)).toEqual([0, 255]);
  expect(
    rasterize({
      ...args,
      source: invalid,
      limits: sampleLimits(invalid),
      buffer: result.pixels,
    }).pixels
  ).toEqual(new Uint8ClampedArray(8));
});

test.each([Encoding.RGB, Encoding.BGR, Encoding.RGBA, Encoding.BGRA])(
  'samples color encoding %s without intensity scaling',
  (encoding) => {
    const channels =
      encoding === Encoding.RGBA || encoding === Encoding.BGRA ? 4 : 3;
    const reversed = encoding === Encoding.BGR || encoding === Encoding.BGRA;
    const frame = source(
      new Uint8Array(channels === 4 ? [10, 20, 30, 40] : [10, 20, 30]),
      1,
      1,
      encoding,
      channels
    );
    expect(frame.color).toBe(true);
    const result = rasterize({
      source: frame,
      ranges: { x: [0, 1], y: [0, 1] },
      size: { width: 10, height: 10 },
      colormap: 'viridis',
      limits: [0, 1],
    });
    expect(Array.from(result.pixels)).toEqual([
      reversed ? 30 : 10,
      20,
      reversed ? 10 : 30,
      channels === 4 ? 40 : 255,
    ]);
  }
);

test('returns an empty crop outside the image', () => {
  const frame = source(new Uint16Array([1]), 1, 1);
  const result = rasterize({
    source: frame,
    ranges: { x: [10, 20], y: [10, 20] },
    size: { width: 100, height: 100 },
    colormap: 'none',
    limits: [0, 1],
  });
  expect(result.pixels.length).toBe(0);
});

test('rejects an explicit zero channel count', () => {
  expect(source(new Uint16Array([1]), 1, 1, Encoding.GRAY, 0)).toBeUndefined();
});

test('constant frames use the first palette entry', () => {
  const frame = source(new Uint16Array([7]), 1, 1);
  const result = rasterize({
    source: frame,
    ranges: { x: [0, 1], y: [0, 1] },
    size: { width: 10, height: 10 },
    colormap: 'none',
    limits: sampleLimits(frame),
  });
  expect(Array.from(result.pixels)).toEqual([0, 0, 0, 255]);
});

test.each([
  {
    data: [-Number.MAX_VALUE, 0, Number.MAX_VALUE, NaN, Infinity, -Infinity],
    limits: [-Number.MAX_VALUE, Number.MAX_VALUE],
    bytes: [0, 128, 255, undefined, undefined, undefined],
  },
  { data: [0, 1, 2, 3, 4], limits: [1, 3], bytes: [0, 0, 128, 255, 255] },
  {
    data: [7, NaN, Infinity, -Infinity],
    limits: [7, 7],
    bytes: [0, undefined, undefined, undefined],
  },
  {
    data: [0, Number.MIN_VALUE, Number.MIN_VALUE * 2],
    limits: [0, Number.MIN_VALUE * 2],
    bytes: [0, 128, 255],
  },
])(
  'preserves exact grayscale bytes for $limits including invalid samples',
  ({ data, limits, bytes }) => {
    const result = rasterize({
      source: source(new Float64Array(data), data.length, 1),
      ranges: { x: [0, data.length], y: [0, 1] },
      size: { width: data.length, height: 1 },
      colormap: 'none',
      limits: limits as [number, number],
      buffer: new Uint8ClampedArray(data.length * 4).fill(255),
    });
    expect(Array.from(result.pixels)).toEqual(
      bytes.flatMap((byte) =>
        byte === undefined ? [0, 0, 0, 0] : [byte, byte, byte, 255]
      )
    );
  }
);

test('scales uint64 data with numeric fixed limits', () => {
  const result = rasterize({
    source: source(new BigUint64Array([0n, 1n, 2n]), 3, 1),
    ranges: { x: [0, 3], y: [0, 1] },
    size: { width: 3, height: 1 },
    colormap: 'none',
    limits: [0, 2],
  });
  expect(Array.from(result.pixels)).toEqual([
    0, 0, 0, 255, 128, 128, 128, 255, 255, 255, 255, 255,
  ]);
});

test('preserves adjacent signed int64 values and clips outside the limits', () => {
  const min = -9223372036854775807n;
  const frame = source(
    new BigInt64Array([min - 1n, min, min + 1n, min + 2n, min + 3n]),
    5,
    1
  );
  const result = rasterize({
    source: frame,
    ranges: { x: [0, 5], y: [0, 1] },
    size: { width: 5, height: 1 },
    colormap: 'none',
    limits: [min, min + 2n],
  });
  expect(Array.from(result.pixels)).toEqual([
    0, 0, 0, 255, 0, 0, 0, 255, 128, 128, 128, 255, 255, 255, 255, 255, 255,
    255, 255, 255,
  ]);
});

test('retains every uint16 rounding boundary across the sampled 4K contrast range', () => {
  const data = Uint16Array.from({ length: 65536 }, (_, value) => value);
  const result = rasterize({
    source: source(data, 256, 256),
    ranges: { x: [0, 256], y: [0, 256] },
    size: { width: 256, height: 256 },
    colormap: 'none',
    limits: [0, 65280],
  });
  const mismatch = data.findIndex((value, index) => {
    const byte = Math.min(255, Math.round((value / 65280) * 255));
    return (
      result.pixels[index * 4] !== byte ||
      result.pixels[index * 4 + 1] !== byte ||
      result.pixels[index * 4 + 2] !== byte ||
      result.pixels[index * 4 + 3] !== 255
    );
  });
  expect(mismatch).toBe(-1);
});

test('converts sampled uint16 pixels directly into the reusable output across frames and settings', () => {
  const args = {
    source: source(new Uint16Array([0, 10, 20, 30, 40, 50, 60, 70]), 4, 2),
    ranges: { x: [0, 4] as [number, number], y: [0, 2] as [number, number] },
    size: { width: 2, height: 2 },
    colormap: 'none',
    limits: [10, 50] as [number, number],
  };
  const first = rasterize(args);
  expect(Array.from(first.pixels)).toEqual([
    0, 0, 0, 255, 128, 128, 128, 255, 191, 191, 191, 255, 255, 255, 255, 255,
  ]);
  const latest = new Uint16Array(8).fill(25);
  const changed = {
    ...args,
    colormap: 'viridis',
    limits: [0, 100] as [number, number],
  };
  const next = rasterize({
    ...changed,
    source: source(latest, 4, 2),
    buffer: first.pixels,
  });
  const reference = rasterize({
    ...changed,
    source: source(new Float64Array(latest), 4, 2),
  });
  expect(next.pixels).toBe(first.pixels);
  expect(next.pixels).toEqual(reference.pixels);
  rasterize({ ...args, limits: [25, 25], buffer: next.pixels });
  expect(Array.from(next.pixels)).toEqual([
    0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255,
  ]);
});

test('keeps overflow-safe scaling for uint16 data with extreme fixed limits', () => {
  const result = rasterize({
    source: source(new Uint16Array([0, 1, 65535]), 3, 1),
    ranges: { x: [0, 3], y: [0, 1] },
    size: { width: 3, height: 1 },
    colormap: 'none',
    limits: [-Number.MAX_VALUE, Number.MAX_VALUE],
  });
  expect(Array.from(result.pixels)).toEqual([
    128, 128, 128, 255, 128, 128, 128, 255, 128, 128, 128, 255,
  ]);
});

test('copies packed color without preparing a grayscale palette', () => {
  const palette = jest.spyOn(colormaps, 'getColormap');
  try {
    const result = rasterize({
      source: source(new Uint8Array([10, 20, 30, 40]), 1, 1, Encoding.BGRA, 4),
      ranges: { x: [0, 1], y: [0, 1] },
      size: { width: 1, height: 1 },
      colormap: 'viridis',
      limits: [0, 1],
    });
    expect(Array.from(result.pixels)).toEqual([30, 20, 10, 40]);
    expect(palette).not.toHaveBeenCalled();
  } finally {
    palette.mockRestore();
  }
});
