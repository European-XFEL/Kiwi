import fs from 'fs';
import { Schema } from '@/karabo-hash/hash';
import { AccessMode, Assignment, AccessLevel } from '@/karabo-hash/enums';

import { decodeBinarySchema } from '@/karabo-hash/bin_reader';
import { buildBinding } from '@/lib/binding/BindingFactory';
import {
  BindingRoot,
  BaseBinding,
  BindingNamespace,
} from '@/lib/binding/BaseBinding';

import path from 'path';

describe('check binding', () => {
  it('BaseBinding Mutable', () => {
    const leaf = new BaseBinding({ value: 1 });
    const ns1 = new BindingNamespace<BaseBinding>();
    const ns2 = new BindingNamespace<BaseBinding>();

    ns1.set('leaf', leaf);
    ns2.set('leaf', leaf);
    ns1.get('leaf').value = 99;
    expect(ns2.get('leaf').value).toBe(99);
  });

  it('BindingRoot Namespace Mutable', () => {
    const leaf = new BaseBinding({ value: 1 });
    const root = new BindingRoot();
    root.value.set('leaf', leaf);
    expect(root.value.length).toBe(1);

    const binding1 = root.getBinding('leaf');
    const binding2 = root.getBinding('leaf');
    expect(binding1).toBeInstanceOf(BaseBinding);
    expect(binding2).toBeInstanceOf(BaseBinding);

    binding1.value = 99;
    expect(binding1.value).toBe(99);
    expect(binding2.value).toBe(99);

    root.value.get('leaf').value = 13;
    expect(root.value.get('leaf').value).toBe(13);
    expect(binding1.value).toBe(13);
    expect(binding2.value).toBe(13);

    root.value.clear_namespace();
    expect(root.value.length).toBe(0);
  });

  it('schema', () => {
    const filePath = path.join(__dirname, 'schema_hash.bin');
    const data = fs.readFileSync(filePath);
    const schema = decodeBinarySchema(data);
    expect(schema instanceof Schema).toBe(true);
    expect(schema.name).toBe('PropertyTest');

    const bindingRoot = buildBinding(schema);
    expect(bindingRoot.classId).toBe('PropertyTest');
    expect(bindingRoot).toBeInstanceOf(BindingRoot);
    expect(bindingRoot.value).toBeInstanceOf(BindingNamespace);
    expect(bindingRoot.value.length).toBe(67);

    // Uint 32 Property
    const leaf = bindingRoot.value.get('uint32PropertyReadOnly');
    expect(leaf).toBeInstanceOf(BaseBinding);
    expect(leaf.hashType).toBe(14);
    expect(leaf.displayedName).toBe('UInt32 property read-only');
    expect(leaf.accessMode).toBe(AccessMode.READONLY);
    expect(leaf.assignment).toBe(Assignment.OPTIONAL);
    expect(leaf.requiredAccessLevel).toBe(AccessLevel.OBSERVER);

    expect(leaf.attributes.getValue('nodeType')).toBe(0);
    expect(leaf.attributes.getValue('valueType')).toBe('UINT32');

    // Bool Property
    const bool = bindingRoot.value.get('boolProperty');
    expect(bool).toBeInstanceOf(BaseBinding);
    expect(bool.hashType).toBe(0);
    expect(bool.displayedName).toBe('Bool property');
    expect(bool.accessMode).toBe(AccessMode.RECONFIGURABLE);
    expect(bool.assignment).toBe(Assignment.OPTIONAL);
    expect(bool.requiredAccessLevel).toBe(AccessLevel.OPERATOR);

    expect(bool.attributes.getValue('nodeType')).toBe(0);
    expect(bool.attributes.getValue('valueType')).toBe('BOOL');

    // Node Property
    const node = bindingRoot.value.get('vectors');
    expect(node).toBeInstanceOf(BaseBinding);
    expect(node.hashType).toBe(30);
    expect(node.assignment).toBe(Assignment.OPTIONAL);
    expect(node.requiredAccessLevel).toBe(AccessLevel.OBSERVER);

    // Noded Property
    const nodeVectorBool = node.value.get('boolProperty');
    expect(nodeVectorBool).toBeInstanceOf(BaseBinding);
    expect(nodeVectorBool.hashType).toBe(1);
    expect(nodeVectorBool.assignment).toBe(Assignment.OPTIONAL);
    expect(nodeVectorBool.requiredAccessLevel).toBe(AccessLevel.OPERATOR);

    // Convenience getters
    const nodeVectorInt32 = bindingRoot.getBinding('vectors.int32Property');
    expect(nodeVectorInt32).toBeInstanceOf(BaseBinding);
    expect(nodeVectorInt32.hashType).toBe(13);
    expect(nodeVectorInt32.assignment).toBe(Assignment.OPTIONAL);
    expect(nodeVectorInt32.requiredAccessLevel).toBe(AccessLevel.OPERATOR);
  });
});
