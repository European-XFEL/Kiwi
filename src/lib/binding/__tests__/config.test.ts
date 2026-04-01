import fs from 'fs';
import path from 'path';

import { Schema, Hash } from '@/karabo/data/hash';
import { decodeBinarySchema } from '@/karabo/data/bin_reader';
import { buildBinding } from '@/lib/binding/BindingFactory';
import { applyConfiguration } from '@/lib/binding/DeviceProxy';

describe('check configuration', () => {
  it('check apply', () => {
    const filePath = path.join(__dirname, 'schema_hash.bin');
    const data = fs.readFileSync(filePath);

    const schema = decodeBinarySchema(data);
    expect(schema).toBeInstanceOf(Schema);
    expect(schema.name).toBe('PropertyTest');

    const bindingRoot = buildBinding(schema);
    expect(bindingRoot.classId).toBe('PropertyTest');

    const leaf = bindingRoot.value.get('uint32PropertyReadOnly');
    const bool = bindingRoot.value.get('boolProperty');
    const vectors = bindingRoot.value.get('vectors');

    expect(leaf).toBeDefined();
    expect(bool).toBeDefined();
    expect(vectors).toBeDefined();

    const nodeVectorInt32 = bindingRoot.getBinding('vectors.int32Property');
    const nodeVectorBool = vectors?.value?.get('boolProperty');

    expect(nodeVectorInt32).toBeDefined();
    expect(nodeVectorBool).toBeDefined();

    const config = new Hash(
      'boolProperty',
      false,
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

    // For arrays, use deep equality:
    expect(nodeVectorInt32?.value.value_).toEqual([1, 2]);
    expect(nodeVectorBool?.value.value_).toEqual([true, false]);
  });
});
