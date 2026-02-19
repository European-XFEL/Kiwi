import fs from 'fs';
import { Hash, HashList, Schema } from '@/karabo/data/hash';
import { decodeBinary, decodeBinarySchema } from '@/karabo/data/bin_reader';
import { encodeBinary } from '@/karabo/data/bin_writer';

import path from 'path';

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
    // We cast to 'any' to access the raw .value_ property of the KaraboType wrapper
    expect(
      (hsh.getAttribute('uint8PropertyReadOnly', 'sec') as any).value_
    ).toBe(1631725047n);
    expect(
      (hsh.getAttribute('uint8PropertyReadOnly', 'frac') as any).value_
    ).toBe(661721908000000000n);
    expect(
      (hsh.getAttribute('uint8PropertyReadOnly', 'tid') as any).value_
    ).toBe(0n);
    expect(
      (hsh.getAttribute('uint8PropertyReadOnly', 'alarmCondition') as any)
        .value_
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
    expect(hsh.getValue('vectors.uint8Property')).toEqual([
      41, 42, 43, 44, 45, 46,
    ]);
    expect(hsh.getValue('vectors.int16Property')).toEqual([
      20041, 20042, 20043, 20044, 20045, 20046,
    ]);
    expect(hsh.getValue('vectors.uint16Property')).toEqual([
      10041, 10042, 10043, 10044, 10045, 10046,
    ]);
    expect(hsh.getValue('vectors.uint32Property')).toEqual([
      90000041, 90000042, 90000043, 90000044, 90000045, 90000046,
    ]);
    expect(hsh.getValue('vectors.int64Property')).toEqual([
      20000000041n,
      20000000042n,
      20000000043n,
      20000000044n,
      20000000045n,
      20000000046n,
    ]);
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
});
