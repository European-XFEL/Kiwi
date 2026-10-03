import {
  Encoding,
  Hash,
  HashAttributes,
  HashType,
  Schema,
  Timestamp,
} from '@/karabo/data/api';
import {
  VectorCharValue,
  VectorUInt64Value,
  VectorBoolValue,
} from '@/karabo/data/types';
import {
  applyConfiguration,
  buildBinding,
  ByteArrayBinding,
  DeviceProxy,
  ImageBinding,
  NDArrayBinding,
  PropertyProxy,
  VectorBoolBinding,
} from '@/lib/binding/api';
import { decodeArrayData, getBindingArrayValue } from '@/lib/binding/arrays';
import {
  getArrayData,
  getDimensionsAndEncoding,
  getImageData,
} from '../arrays';

function leaf(hash: Hash, name: string, valueType: string) {
  hash.setElement(
    name,
    new Hash(),
    new HashAttributes({ nodeType: 0, valueType })
  );
}

function setup(displayType = 'Image') {
  const array = new Hash();
  leaf(array, 'data', 'BYTE_ARRAY');
  leaf(array, 'type', 'INT32');
  leaf(array, 'shape', 'VECTOR_UINT64');
  leaf(array, 'isBigEndian', 'BOOL');
  const image = new Hash();
  image.setElement(
    'pixels',
    array,
    new HashAttributes({ nodeType: 1, displayType: 'NDArray' })
  );
  leaf(image, 'dims', 'VECTOR_UINT64');
  leaf(image, 'encoding', 'INT32');
  const hash = new Hash();
  hash.setElement(
    'image',
    image,
    new HashAttributes({ nodeType: 1, displayType })
  );
  leaf(hash, 'vector', 'VECTOR_BOOL');
  const root = new DeviceProxy('DEV');
  root.binding = buildBinding(new Schema('Arrays', hash));
  const timestamp = new Timestamp();
  const imageNode = root.getBinding('image') as ImageBinding;
  const arrayNode = root.getBinding('image.pixels') as NDArrayBinding;
  function configure(
    data = new Uint8Array([1, 2, 3, 4, 5, 6]),
    type = HashType.UInt8,
    dims = [2n, 3n],
    encoding = Encoding.UNDEFINED
  ) {
    applyConfiguration(
      new Hash(
        'image.pixels.data',
        new VectorCharValue(data),
        'image.pixels.type',
        type,
        'image.pixels.shape',
        new VectorUInt64Value([99n, 99n]),
        'image.pixels.isBigEndian',
        true,
        'image.dims',
        new VectorUInt64Value(dims),
        'image.encoding',
        encoding
      ),
      root.binding,
      timestamp
    );
  }
  return { root, timestamp, imageNode, arrayNode, configure };
}

test.each(['Image', 'ImageData'])(
  'builds and configures %s with nested NDArray bytes',
  (displayType) => {
    const { root, arrayNode, imageNode, timestamp, configure } =
      setup(displayType);
    expect(imageNode).toBeInstanceOf(ImageBinding);
    expect(arrayNode).toBeInstanceOf(NDArrayBinding);
    expect(root.getBinding('image.pixels.data')).toBeInstanceOf(
      ByteArrayBinding
    );
    configure();
    const proxy = new PropertyProxy(root, 'image.pixels');
    const [data, ts] = getArrayData(proxy);
    expect(data).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
    expect(ts).toBe(timestamp);
    expect(arrayNode.timestamp).toBeUndefined();
    expect(getImageData(imageNode, 3, 2, undefined)).toEqual({
      data,
      shape: [2, 3],
    });
  }
);

test.each([
  [HashType.Bool, new Uint8Array([0, 1])],
  [HashType.Char, new Uint8Array([0, 255])],
  [HashType.Int8, new Int8Array([-128, 127])],
  [HashType.UInt8, new Uint8Array([0, 255])],
  [HashType.Int16, new Int16Array([-32768, 32767])],
  [HashType.UInt16, new Uint16Array([0, 65535])],
  [HashType.Int32, new Int32Array([-2147483648, 2147483647])],
  [HashType.UInt32, new Uint32Array([0, 4294967295])],
  [
    HashType.Int64,
    new BigInt64Array([-9007199254740993n, 9223372036854775807n]),
  ],
  [
    HashType.UInt64,
    new BigUint64Array([9007199254740993n, 18446744073709551615n]),
  ],
  [HashType.Float, new Float32Array([-1.25, 0.125])],
  [HashType.Double, new Float64Array([-1.23456789, Math.PI])],
])('decodes native dtype %s exactly through bindings', (type, expected) => {
  const { root, configure } = setup();
  configure(new Uint8Array(expected.buffer), type);
  const [data] = getArrayData(new PropertyProxy(root, 'image.pixels'));
  expect(data).toBeInstanceOf(expected.constructor);
  expect(data).toEqual(expected);
});

test('uses only the byte range, reusing aligned storage and copying unaligned storage', () => {
  const samples = new Int32Array([-7, 12]);
  const aligned = new Uint8Array(16);
  aligned.set(new Uint8Array(samples.buffer), 4);
  const decoded = decodeArrayData(aligned.subarray(4, 12), HashType.Int32)!;
  expect(decoded).toEqual(samples);
  expect(decoded.buffer).toBe(aligned.buffer);
  const unaligned = new Uint8Array(11);
  unaligned.set(new Uint8Array(samples.buffer), 1);
  const copied = decodeArrayData(unaligned.subarray(1, 9), HashType.Int32)!;
  expect(copied).toEqual(samples);
  expect(copied.buffer).not.toBe(unaligned.buffer);
  expect(copied.byteLength).toBe(8);
  expect(() => decodeArrayData(new Uint8Array(3), HashType.Int16)).toThrow(
    RangeError
  );
});

test('passes through vectors and their timestamps', () => {
  const { root, timestamp } = setup();
  applyConfiguration(
    new Hash('vector', new VectorBoolValue([true, false])),
    root.binding,
    timestamp
  );
  expect(root.getBinding('vector')).toBeInstanceOf(VectorBoolBinding);
  expect(getArrayData(new PropertyProxy(root, 'vector'))).toEqual([
    [true, false],
    timestamp,
  ]);
});

test('returns fresh fallback timestamps for missing values and unsupported types', () => {
  const { root, configure, arrayNode } = setup();
  const proxies = [
    undefined,
    new PropertyProxy(root, 'missing'),
    new PropertyProxy(root, 'vector'),
    new PropertyProxy(root, 'image.pixels'),
  ];
  for (const proxy of proxies) {
    const [data, timestamp] = getArrayData(proxy, 'fallback');
    expect(data).toBe('fallback');
    expect(timestamp).toBeInstanceOf(Timestamp);
    expect(getArrayData(proxy, 'fallback')[1]).not.toBe(timestamp);
  }
  configure(new Uint8Array([1]), HashType.String);
  expect(getBindingArrayValue(arrayNode, null)[0]).toBeNull();
  expect(() =>
    getImageData(root.getBinding('image') as ImageBinding, 1, 1, 0)
  ).toThrow('Unsupported image pixel type');
  arrayNode.value.clear_namespace();
  expect(getBindingArrayValue(arrayNode)[0]).toBeUndefined();
});

test('empty pixels have no image but decode to an empty NDArray', () => {
  const { root, imageNode, configure } = setup();
  expect(getImageData(imageNode, 0, 0, 0)).toBeUndefined();
  configure(new Uint8Array());
  expect(getImageData(imageNode, 0, 0, 0)).toBeUndefined();
  expect(getArrayData(new PropertyProxy(root, 'image.pixels'))[0]).toEqual(
    new Uint8Array()
  );
});

test.each([
  [[2n, 3n], Encoding.GRAY],
  [[2n, 3n, 3n], Encoding.RGB],
  [[2n, 3n, 4n], Encoding.RGBA],
  [[2n, 3n, 5n], Encoding.GRAY],
])('orders dimensions and infers encoding for %s', (dims, encoding) => {
  const { imageNode, configure } = setup();
  const count = dims.reduce((size, dim) => size * Number(dim), 1);
  configure(new Uint8Array(count), HashType.UInt8, dims);
  const [x, y, z, inferred] = getDimensionsAndEncoding(imageNode);
  expect([x, y, z, inferred]).toEqual([
    3,
    2,
    dims.length === 3 ? Number(dims[2]) : undefined,
    encoding,
  ]);
  expect(getImageData(imageNode, x, y, z)?.shape).toEqual(dims.map(Number));
  expect(() => getImageData(imageNode, 99, y, z)).toThrow(
    `Image has improper shape (99, 2, ${z}) for size ${count}`
  );
});

test.each([Encoding.BGR, Encoding.JPEG, Encoding.RGB])(
  'preserves explicit encoding %s',
  (encoding) => {
    const { imageNode, configure } = setup();
    configure(undefined, undefined, undefined, encoding);
    expect(getDimensionsAndEncoding(imageNode)).toEqual([
      3,
      2,
      undefined,
      encoding,
    ]);
    configure(undefined, undefined, [1n], encoding);
    expect(getDimensionsAndEncoding(imageNode)).toEqual([
      undefined,
      undefined,
      undefined,
      encoding,
    ]);
  }
);

test('rejects unsafe UInt64 dimensions without rounding', () => {
  const { imageNode, configure } = setup();
  configure(undefined, undefined, [1n, 9007199254740993n]);
  expect(() => getDimensionsAndEncoding(imageNode)).toThrow(RangeError);
  configure(undefined, undefined, [1n, BigInt(Number.MAX_SAFE_INTEGER)]);
  expect(getDimensionsAndEncoding(imageNode)[0]).toBe(Number.MAX_SAFE_INTEGER);
});
