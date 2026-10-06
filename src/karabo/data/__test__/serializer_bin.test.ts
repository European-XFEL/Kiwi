import fs from 'fs';
import { Buffer } from 'node:buffer';
import { Hash, HashList, Schema } from '../hash';
import { decodeBinary, decodeBinarySchema } from '../bin_reader';
import { encodeBinary } from '../bin_writer';
import * as Types from '../types';
import { HashType } from '../typenums';

import path from 'path';

const vectors = [
  [new Int8Array([0, -128, 127]), Types.VectorInt8Value, [-128, 127]],
  [new Uint8Array([0, 0, 255]), Types.VectorCharValue, [0, 255]],
  [new Int16Array([0, -32768, 32767]), Types.VectorInt16Value, [-32768, 32767]],
  [new Uint16Array([0, 0, 65535]), Types.VectorUInt16Value, [0, 65535]],
  [
    new Int32Array([0, -2147483648, 2147483647]),
    Types.VectorInt32Value,
    [-2147483648, 2147483647],
  ],
  [
    new Uint32Array([0, 0, 4294967295]),
    Types.VectorUInt32Value,
    [0, 4294967295],
  ],
  [
    new BigInt64Array([0n, -9223372036854775808n, 9223372036854775807n]),
    Types.VectorInt64Value,
    [-9223372036854775808n, 9223372036854775807n],
  ],
  [
    new BigUint64Array([0n, 0n, 18446744073709551615n]),
    Types.VectorUInt64Value,
    [0n, 18446744073709551615n],
  ],
  [new Float32Array([0, -1.5, 2.25]), Types.VectorFloatValue, [-1.5, 2.25]],
  [
    new Float64Array([0, -Number.MAX_VALUE, Number.MAX_VALUE]),
    Types.VectorDoubleValue,
    [-Number.MAX_VALUE, Number.MAX_VALUE],
  ],
] as const;

describe('binary', () => {
  it('reading', () => {
    const filePath = path.join(__dirname, 'conf_hash.bin');
    const data = fs.readFileSync(filePath);
    const hsh = decodeBinary(data);

    // 1. Direct Access via get()
    expect(hsh.getValue('deviceId')).toBe('Bob');
    expect(hsh.getValue('classId')).toBe('PropertyTest');
    expect(hsh.getValue('alarmCondition')).toBe('none');
    expect(hsh.getValue('boolPropertyReadOnly')).toBe(false);
    expect(hsh.getValue('uint16PropertyReadOnly')).toBe(32000);
    expect(hsh.getValue('int16PropertyReadOnly')).toBe(3200);
    expect(hsh.getValue('uint32PropertyReadOnly')).toBe(32000000);
    expect(hsh.getValue('floatPropertyReadOnly')).toBe(3.1415960788726807);
    expect(hsh.getValue('uint8PropertyReadOnly')).toBe(177);

    // 3. Test Attributes
    expect(
      (hsh.getAttribute('uint8PropertyReadOnly', 'sec') as Types.KaraboValue)
        .value_
    ).toBe(1631725047n);
    expect(
      (hsh.getAttribute('uint8PropertyReadOnly', 'frac') as Types.KaraboValue)
        .value_
    ).toBe(661721908000000000n);
    expect(
      (hsh.getAttribute('uint8PropertyReadOnly', 'tid') as Types.KaraboValue)
        .value_
    ).toBe(0n);
    expect(
      (
        hsh.getAttribute(
          'uint8PropertyReadOnly',
          'alarmCondition'
        ) as Types.KaraboValue
      ).value_
    ).toBe('none');

    // 4. Test Vectors (arrays)
    expect(hsh.getValue('vectors.boolProperty')).toEqual([
      true,
      false,
      true,
      false,
      true,
      false,
    ]);
    expect(hsh.getValue('vectors.uint8Property')).toEqual(
      new Types.VectorUInt8Value([41, 42, 43, 44, 45, 46])
    );
    expect(hsh.getValue('vectors.int16Property')).toEqual(
      new Types.VectorInt16Value([20041, 20042, 20043, 20044, 20045, 20046])
    );
    expect(hsh.getValue('vectors.uint16Property')).toEqual(
      new Types.VectorUInt16Value([10041, 10042, 10043, 10044, 10045, 10046])
    );
    expect(hsh.getValue('vectors.uint32Property')).toEqual(
      new Types.VectorUInt32Value([
        90000041, 90000042, 90000043, 90000044, 90000045, 90000046,
      ])
    );
    expect(hsh.getValue('vectors.int64Property')).toEqual(
      new Types.VectorInt64Value([
        20000000041n,
        20000000042n,
        20000000043n,
        20000000044n,
        20000000045n,
        20000000046n,
      ])
    );
    expect(hsh.getValue('vectors.stringProperty')).toEqual([
      '1111111',
      '2222222',
      '3333333',
      '4444444',
      '5555555',
      '6666666',
    ]);

    expect(hsh).toBeInstanceOf(Hash);

    // 5. Iteration test
    for (const [key, value, attrs] of hsh.iterallValues()) {
      if (key === 'uint32PropertyReadOnly') {
        expect(typeof value).not.toBe('object'); // Should be primitive number
        expect(value).toBe(32000000);
        expect(attrs['alarmCondition']).toBe('none');
      }
      if (key === 'output') {
        expect(value).toBeInstanceOf(Hash);
        // Check keys of the sub-hash
        const keys = Array.from((value as Hash).keys());
        expect(keys).toEqual(
          expect.arrayContaining([
            'bytesRead',
            'bytesWritten',
            'connections',
            'distributionMode',
            'hostname',
            'noInputShared',
            'port',
            'schema',
            'updatePeriod',
          ])
        );
      }
    }
  });

  it('writing', () => {
    const filePath = path.join(__dirname, 'conf_hash.bin');

    const data = fs.readFileSync(filePath);
    const hsh = decodeBinary(data);

    const new_data = encodeBinary(hsh);

    const new_hsh = decodeBinary(new Uint8Array(new_data));

    const keys = [
      '_serverId_',
      'deviceId',
      'classId',
      'alarmCondition',
      'boolPropertyReadOnly',
      'uint16PropertyReadOnly',
      'int16PropertyReadOnly',
      'uint32PropertyReadOnly',
      'floatPropertyReadOnly',
      'uint8PropertyReadOnly',
    ];

    for (const key of keys) {
      expect(hsh.getValue(key)).toBe(new_hsh.getValue(key));
    }

    const table = new_hsh.get('table');
    expect(table instanceof HashList).toBe(true);

    // HashList / VectorHash handling
    const read_table = hsh.getValue('table');
    const new_table = new_hsh.getValue('table');

    // Should be Array of Hash objects (unwrapped from HashList)
    expect(read_table).toBeInstanceOf(Array);
    expect(new_table).toBeInstanceOf(Array);

    const read_table_arr = read_table as Hash[];
    const new_table_arr = new_table as Hash[];

    expect(read_table_arr.length).toBe(new_table_arr.length);

    for (let i = 0; i < read_table_arr.length; i++) {
      const read = read_table_arr[i];
      const new_ = new_table_arr[i];
      expect(read).toBeInstanceOf(Hash);
      expect(new_).toBeInstanceOf(Hash);

      const read_keys = Array.from(read.keys());
      const new_keys = Array.from(new_.keys());

      expect(read_keys).toEqual(new_keys);

      expect(read.getValue('e1')).toBe(new_.getValue('e1'));
      expect(read.getValue('e2')).toBe(new_.getValue('e2'));
      expect(read.getValue('e3')).toBe(new_.getValue('e3'));
      expect(read.getValue('e4')).toBe(new_.getValue('e4'));
      // Use 5 digits precision for floating point comparison ~ 0.00001
      expect(read.getValue('e5')).toBeCloseTo(new_.getValue('e5') as number, 5);
    }
  });

  it('decodes numeric vectors into their public wrappers', () => {
    const original = new Hash(
      'int8',
      new Types.VectorInt8Value([-128, 127]),
      'uint8',
      new Types.VectorUInt8Value([0, 255]),
      'int16',
      new Types.VectorInt16Value([-32768, 32767]),
      'uint16',
      new Types.VectorUInt16Value([0, 65535]),
      'int32',
      new Types.VectorInt32Value([-2147483648, 2147483647]),
      'uint32',
      new Types.VectorUInt32Value([0, 4294967295]),
      'int64',
      new Types.VectorInt64Value([-9223372036854775808n, 9223372036854775807n]),
      'uint64',
      new Types.VectorUInt64Value([0n, 18446744073709551615n]),
      'float',
      new Types.VectorFloatValue([-1.5, 2.25]),
      'double',
      new Types.VectorDoubleValue([-Math.PI, Number.MAX_VALUE])
    );

    const decoded = decodeBinary(new Uint8Array(encodeBinary(original)));

    for (const [key, value] of original) {
      const actual = decoded.get(key);
      expect(actual).toBeInstanceOf(
        (value.data as Types.KaraboValue).constructor
      );
      expect(actual.value_).toBe(actual);
      expect(actual.value_).toEqual((value.data as Types.KaraboValue).value_);
    }
  });

  it('schema', () => {
    const filePath = path.join(__dirname, 'schema_hash.bin');
    const data = fs.readFileSync(filePath);
    const schema = decodeBinarySchema(data);
    expect(schema instanceof Schema).toBe(true);

    expect(schema.name).toBe('PropertyTest');

    for (const [key, value, attrs] of schema.hash.iterallValues()) {
      if (key === 'uint32PropertyReadOnly') {
        expect(value).toBe(0);
        expect(attrs['nodeType']).toBe(0);
        expect(attrs['valueType']).toBe('UINT32');
        expect(attrs['displayedName']).toBe('UInt32 property read-only');
      }
      if (key === 'output') {
        expect(value).toBeInstanceOf(Hash);
        const keys = Array.from((value as Hash).keys());
        expect(keys).toEqual(
          expect.arrayContaining([
            'bytesRead',
            'bytesWritten',
            'connections',
            'distributionMode',
            'hostname',
            'noInputShared',
            'port',
            'schema',
            'updatePeriod',
          ])
        );
      }
    }
  });
  test('infers defaults, preserves explicit types and leaves source values untouched', () => {
    const values = {
      int: 42,
      double: 1.25,
      big: -9223372036854775808n,
      bool: true,
      string: '<&\'"',
      ints: [1, 2],
      doubles: [1.5, 2.5],
      bools: [true, false],
      strings: ['<&', 'two'],
      bigs: [1n, -2n],
      empty: [],
      bytes: new Uint8Array([0, 255]),
      explicit: new Types.UInt64Value(18446744073709551615n),
      nested: new Hash('value', 7),
      table: new HashList([new Hash('value', false)]),
      schema: new Schema('test', new Hash('value', 'schema')),
    };
    const hash = new Hash(values);
    const decoded = decodeBinary(new Uint8Array(encodeBinary(hash)));
    const classes = {
      int: Types.Int32Value,
      double: Types.DoubleValue,
      big: Types.Int64Value,
      bool: Types.BoolValue,
      string: Types.StringValue,
      ints: Types.VectorInt32Value,
      doubles: Types.VectorDoubleValue,
      bools: Types.VectorBoolValue,
      strings: Types.VectorStringValue,
      bigs: Types.VectorInt64Value,
      empty: Types.VectorStringValue,
      bytes: Types.VectorCharValue,
      explicit: Types.UInt64Value,
      nested: Hash,
      table: HashList,
      schema: Schema,
    };
    for (const [key, value] of Object.entries(values)) {
      expect(hash.get(key)).toBe(value);
      expect(decoded.get(key)).toBeInstanceOf(classes[key]);
      expect(decoded.get(key).type_).toBe(Types.wrap(value).type_);
    }
    expect(decoded.getValue('int')).toBe(42);
    expect(decoded.getValue('big')).toBe(values.big);
    expect(decoded.getValue('explicit')).toBe(values.explicit.value_);
    expect(decoded.getValue('string')).toBe(values.string);
    expect(Array.from(decoded.getValue('ints'))).toEqual(values.ints);
    expect(Array.from(decoded.getValue('doubles'))).toEqual(values.doubles);
    expect(Array.from(decoded.getValue('bigs'))).toEqual(values.bigs);
    expect(decoded.getValue('bools')).toEqual(values.bools);
    expect(decoded.getValue('strings')).toEqual(values.strings);
    expect(decoded.getValue('empty')).toEqual([]);
    expect(decoded.getValue('bytes')).toEqual(values.bytes);
    expect(decoded.getValue('nested.value')).toBe(7);
    expect(decoded.getValue<HashList>('table')[0].getValue('value')).toBe(
      false
    );
    expect(decoded.getValue<Schema>('schema').hash.getValue('value')).toBe(
      'schema'
    );
    values.ints.push(3);
    expect(
      Array.from(
        decodeBinary(new Uint8Array(encodeBinary(hash))).getValue('ints')
      )
    ).toEqual([1, 2, 3]);
  });

  test('serializes raw and typed attributes, including nested structures', () => {
    const hash = new Hash();
    const attrs = {
      text: '<>&\'" &amp; : newline\n',
      count: 3,
      typed: new Types.UInt16Value(65535),
      vector: new Int16Array([-32768, 32767]),
      nested: new Hash('value', '<&'),
      table: new HashList([new Hash('value', true)]),
      schema: new Schema('test', new Hash('value', 1)),
    };
    hash.setElement('value', 'payload', attrs);
    const decoded = decodeBinary(new Uint8Array(encodeBinary(hash)));
    for (const [key, value] of Object.entries(attrs)) {
      expect(hash.getAttribute('value', key)).toBe(value);
      expect(
        (decoded.getAttribute('value', key) as Types.KaraboValue).type_
      ).toBe(Types.wrap(value).type_);
    }
    expect(decoded.getAttributeValue('value', 'text')).toBe(attrs.text);
    expect(decoded.getAttribute('value', 'typed')).toBeInstanceOf(
      Types.UInt16Value
    );
    expect(decoded.getAttributeValue('value', 'count')).toBe(3);
    expect(Array.from(decoded.getAttributeValue('value', 'vector'))).toEqual([
      -32768, 32767,
    ]);
    expect(decoded.getAttributeValue('value', 'nested').getValue('value')).toBe(
      '<&'
    );
    expect(
      decoded.getAttributeValue('value', 'table')[0].getValue('value')
    ).toBe(true);
    expect(
      decoded.getAttributeValue('value', 'schema').hash.getValue('value')
    ).toBe(1);
  });

  test.each([
    null,
    undefined,
    {},
    { value_: 1 },
    { type_: HashType.Int32 },
    Symbol('unsupported'),
    () => 1,
    new DataView(new ArrayBuffer(4)),
  ])('rejects unsupported values at encoding: %p', (value) => {
    const hash = new Hash('value', value);
    expect(hash.getElement('value').data).toBe(value);
    expect(() => encodeBinary(hash)).toThrow(/Cannot infer|Unsupported/);
    const attrHash = new Hash('value', 1);
    attrHash.setAttribute('value', 'unsupported', value);
    expect(() => encodeBinary(attrHash)).toThrow(/Cannot infer|Unsupported/);
  });

  test('rejects unsupported explicit wire types', () => {
    const hash = new Hash('value', { type_: 24, value_: 1 });
    expect(() => encodeBinary(hash)).toThrow(/Unsupported/);
  });

  test.each(vectors)(
    'preserves %p subviews and owns decoded vector storage',
    (array, Wrapper, limits) => {
      const subview = array.subarray(1);
      const hash = new Hash('v', subview);
      const wrapped = Types.wrap(subview);
      if (ArrayBuffer.isView(wrapped)) {
        expect(wrapped.buffer).toBe(array.buffer);
        expect(wrapped.byteOffset).toBe(subview.byteOffset);
      }
      const decoded = decodeBinary(new Uint8Array(encodeBinary(hash))).get('v');
      expect(decoded).toBeInstanceOf(Wrapper);
      expect(Array.from(Types.unwrap(decoded))).toEqual(limits);
      expect(hash.get('v')).toBe(subview);
      expect(
        decodeBinary(
          new Uint8Array(encodeBinary(new Hash('v', subview.subarray(0, 0))))
        ).getValue('v').length
      ).toBe(0);
      const encoded = new Uint8Array(encodeBinary(hash));
      const unaligned = new Uint8Array(encoded.length + 1);
      unaligned.set(encoded, 1);
      const input = unaligned.subarray(1);
      const fromUnaligned = decodeBinary(input).getValue('v');
      input.fill(0);
      expect(Array.from(fromUnaligned)).toEqual(limits);
      expect(fromUnaligned.buffer).not.toBe(array.buffer);
      const buffer = Buffer.alloc(encoded.length + 3);
      buffer.set(encoded, 3);
      const fromBuffer = decodeBinary(buffer.subarray(3)).getValue('v');
      buffer.fill(0);
      expect(Array.from(fromBuffer)).toEqual(limits);
    }
  );

  test('rejects truncated numeric vector payloads before copying', () => {
    const wire = new Uint8Array(
      encodeBinary(new Hash('v', new Int32Array([1, 2])))
    );
    expect(() => decodeBinary(wire.subarray(0, wire.length - 1))).toThrow(
      'Truncated vector payload'
    );
  });

  test('decodes string vectors without losing UTF-8 content', () => {
    const strings = ['日本語', '𝄞', 'é', '', 'a:b'];
    const decoded = decodeBinary(
      new Uint8Array(encodeBinary(new Hash('v', strings)))
    );
    expect(decoded.get('v')).toBeInstanceOf(Types.VectorStringValue);
    expect(decoded.getValue('v')).toEqual(strings);
  });

  test('decoded boolean vectors own their values', () => {
    const wire = Buffer.from(encodeBinary(new Hash('v', [true, false, true])));
    const decoded = decodeBinary(wire).getValue('v');
    wire.fill(0);
    expect(decoded).toEqual([true, false, true]);
  });

  test('writes little-endian vector count and payload with the expected type tag', () => {
    const wire = encodeBinary(new Hash('v', new Uint16Array([0x1234, 0xabcd])));
    expect(Array.from(new Uint8Array(wire))).toEqual([
      1,
      0,
      0,
      0,
      1,
      118,
      HashType.VectorUInt16,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      0x34,
      0x12,
      0xcd,
      0xab,
    ]);
  });
});
