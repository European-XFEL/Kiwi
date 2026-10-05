import fs from 'fs';
import path from 'path';

import { Schema, Hash } from '@/karabo/data/hash';
import { decodeBinarySchema } from '@/karabo/data/bin_reader';
import { VectorInt32Value } from '@/karabo/data/types';
import { buildBinding } from '@/lib/binding/BindingFactory';
import { applyConfiguration } from '@/lib/binding/DeviceProxy';
import { BaseBinding, BindingRoot, NodeBinding } from '../BaseBinding';
import { Timestamp, unwrap } from '@/karabo/data/api';

test('notifies nested parents after every configured child is updated', () => {
  const root = new BindingRoot();
  const outer = new NodeBinding();
  const inner = new NodeBinding();
  const first = new BaseBinding();
  const second = new BaseBinding();
  root.value!.set('outer', outer);
  outer.value.set('inner', inner);
  inner.value.set('first', first);
  inner.value.set('second', second);
  const events: string[] = [];
  const timestamp = new Timestamp();
  inner.value_update.subscribe(events, (value, ts) => {
    expect(value).toBe(inner.value);
    expect(ts).toBe(timestamp);
    expect(inner.timestamp).toBe(timestamp);
    expect(unwrap(first.value)).toBe(1);
    expect(unwrap(second.value)).toBe(2);
    events.push('inner');
  });
  outer.value_update.subscribe(events, (value) => {
    expect(value).toBe(outer.value);
    expect(outer.timestamp).toBe(timestamp);
    events.push('outer');
  });
  applyConfiguration(
    new Hash('outer.inner.first', 1, 'outer.inner.second', 2),
    root,
    timestamp
  );
  expect(events).toEqual(['inner', 'outer']);
});

test('bindingUpdated uses the current time when no timestamp is supplied', () => {
  const binding = new NodeBinding();
  const before = Date.now();
  binding.bindingUpdated();
  expect(binding.timestamp).toBeInstanceOf(Timestamp);
  const milliseconds = Number(binding.timestamp!.time / 10n ** 15n);
  expect(milliseconds).toBeGreaterThanOrEqual(before);
  expect(milliseconds).toBeLessThanOrEqual(Date.now());
});

describe('check configuration', () => {
  it('check apply', () => {
    const filePath = path.join(__dirname, 'schema_hash.bin');
    const data = fs.readFileSync(filePath);

    const schema = decodeBinarySchema(data);
    expect(schema).toBeInstanceOf(Schema);
    expect(schema.name).toBe('PropertyTest');

    const bindingRoot = buildBinding(schema);
    expect(bindingRoot.classId).toBe('PropertyTest');

    const leaf = bindingRoot.value!.get('uint32PropertyReadOnly');
    const string = bindingRoot.value!.get('stringProperty');
    const bool = bindingRoot.value!.get('boolProperty');
    const vectors = bindingRoot.value!.get('vectors');

    expect(leaf).toBeDefined();
    expect(string).toBeDefined();
    expect(bool).toBeDefined();
    expect(vectors).toBeDefined();

    const nodeVectorInt32 = bindingRoot.getBinding('vectors.int32Property');
    const nodeVectorBool = vectors?.value?.get('boolProperty');

    expect(nodeVectorInt32).toBeDefined();
    expect(nodeVectorBool).toBeDefined();

    const config = new Hash(
      'boolProperty',
      false,
      'stringProperty',
      'karabo',
      'uint32PropertyReadOnly',
      2,
      'vectors.int32Property',
      [1, 2],
      'vectors.boolProperty',
      [true, false],
      'NonavalableProperty',
      false
    );

    applyConfiguration(config, bindingRoot);

    expect(bool?.value.value_).toBe(false);
    expect(leaf?.value.value_).toBe(2);
    expect(string?.value.value_).toBe('karabo');

    expect(nodeVectorInt32?.value.value_).toEqual(new VectorInt32Value([1, 2]));
    expect(nodeVectorBool?.value.value_).toEqual([true, false]);
  });
});
