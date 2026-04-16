import fs from 'fs';
import { Schema } from '@/karabo/data/hash';
import { AccessMode, Assignment, AccessLevel } from '@/karabo/data/enums';

import { decodeBinarySchema } from '@/karabo/data/bin_reader';
import { buildBinding } from '@/lib/binding/BindingFactory';
import {
  BindingRoot,
  BaseBinding,
  BindingNamespace,
  VectorBoolBinding,
  VectorDoubleBinding,
  VectorUInt32Binding,
  VectorUInt64Binding,
  VectorUInt8Binding,
  VectorFloatBinding,
  VectorStringBinding,
  VectorInt8Binding,
  VectorInt32Binding,
  BoolBinding,
  UInt8Binding,
  UInt32Binding,
  VectorInt64Binding,
  VectorInt16Binding,
  VectorUInt16Binding,
  ImageBinding,
  SlotBinding,
  FloatBinding,
  DoubleBinding,
  Int16Binding,
  Int32Binding,
  Int64Binding,
  Int8Binding,
  UInt16Binding,
  UInt64Binding,
  StringBinding,
} from '@/lib/binding/BaseBinding';
import { VectorHashBinding } from '@/lib/binding/BaseBinding';
import path from 'path';
import * as types from '@/karabo/data/types';

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
    root.value!.set('leaf', leaf);
    expect(root.value!.length).toBe(1);

    const binding1 = root.getBinding('leaf');
    const binding2 = root.getBinding('leaf');
    expect(binding1).toBeInstanceOf(BaseBinding);
    expect(binding2).toBeInstanceOf(BaseBinding);

    binding1!.value = 99;
    expect(binding1!.value).toBe(99);
    expect(binding2!.value).toBe(99);

    root.value!.get('leaf').value = 13;
    expect(root.value!.get('leaf').value).toBe(13);
    expect(binding1!.value).toBe(13);
    expect(binding2!.value).toBe(13);

    root.value!.clear_namespace();
    expect(root.value!.length).toBe(0);
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
    expect(bindingRoot.value!.length).toBe(67);

    // Uint 32 Property
    const leaf = bindingRoot.value!.get('uint32PropertyReadOnly');
    expect(leaf).toBeInstanceOf(BaseBinding);
    expect(leaf).toBeInstanceOf(UInt32Binding);
    expect(leaf.hashType).toBe(14);
    expect(leaf.displayedName).toBe('UInt32 property read-only');
    expect(leaf.accessMode).toBe(AccessMode.READONLY);
    expect(leaf.assignment).toBe(Assignment.OPTIONAL);
    expect(leaf.requiredAccessLevel).toBe(AccessLevel.OBSERVER);

    expect(leaf.attributes.getValue('nodeType')).toBe(0);
    expect(leaf.attributes.getValue('valueType')).toBe('UINT32');

    // Bool Property
    const bool = bindingRoot.value!.get('boolProperty');
    expect(bool).toBeInstanceOf(BaseBinding);
    expect(bool).toBeInstanceOf(BoolBinding);
    expect(bool.hashType).toBe(0);
    expect(bool.displayedName).toBe('Bool property');
    expect(bool.accessMode).toBe(AccessMode.RECONFIGURABLE);
    expect(bool.assignment).toBe(Assignment.OPTIONAL);
    expect(bool.requiredAccessLevel).toBe(AccessLevel.OPERATOR);

    expect(bool.attributes.getValue('nodeType')).toBe(0);
    expect(bool.attributes.getValue('valueType')).toBe('BOOL');

    // table Property
    const tableProperty = bindingRoot.value!.get('table');
    expect(tableProperty).toBeInstanceOf(VectorHashBinding);
    expect(tableProperty.rowSchema).toBeDefined();
    const length = Object.keys(tableProperty.rowSchema).length;
    expect(length).toBe(5);
    expect(tableProperty.assignment).toBe(Assignment.OPTIONAL);
    expect(tableProperty.requiredAccessLevel).toBe(AccessLevel.OPERATOR);

    // Node Property
    const node = bindingRoot.value!.get('vectors');
    expect(node).toBeInstanceOf(BaseBinding);
    expect(node.hashType).toBe(30);
    expect(node.assignment).toBe(Assignment.OPTIONAL);
    expect(node.requiredAccessLevel).toBe(AccessLevel.OBSERVER);

    // Noded Property
    const nodeVectorBool = node.value.get('boolProperty');
    expect(nodeVectorBool).toBeInstanceOf(BaseBinding);
    expect(nodeVectorBool).toBeInstanceOf(VectorBoolBinding);

    expect(nodeVectorBool.hashType).toBe(1);
    expect(nodeVectorBool.assignment).toBe(Assignment.OPTIONAL);
    expect(nodeVectorBool.requiredAccessLevel).toBe(AccessLevel.OPERATOR);

    const nodeVectorString = bindingRoot.getBinding('vectors.stringProperty');
    expect(nodeVectorString).toBeInstanceOf(VectorStringBinding);

    const nodeVectorFloat = bindingRoot.getBinding('vectors.floatProperty');
    expect(nodeVectorFloat).toBeInstanceOf(VectorFloatBinding);

    const nodeVectorInt8 = bindingRoot.getBinding('vectors.int8Property');
    expect(nodeVectorInt8).toBeInstanceOf(VectorInt8Binding);

    const nodeVectorInt16 = bindingRoot.getBinding('vectors.int16Property');
    expect(nodeVectorInt16).toBeInstanceOf(VectorInt16Binding);

    // Convenience getters
    const nodeVectorInt32 = bindingRoot.getBinding('vectors.int32Property');
    expect(nodeVectorInt32).toBeInstanceOf(BaseBinding);
    expect(nodeVectorInt32).toBeInstanceOf(VectorInt32Binding);

    expect(nodeVectorInt32!.hashType).toBe(13);
    expect(nodeVectorInt32!.assignment).toBe(Assignment.OPTIONAL);
    expect(nodeVectorInt32!.requiredAccessLevel).toBe(AccessLevel.OPERATOR);

    const nodeVectorInt64 = bindingRoot.getBinding('vectors.int64Property');
    expect(nodeVectorInt64).toBeInstanceOf(VectorInt64Binding);

    const nodeVectorUInt8 = bindingRoot.getBinding('vectors.uint8Property');
    expect(nodeVectorUInt8).toBeInstanceOf(VectorUInt8Binding);

    const nodeVectorUInt16 = bindingRoot.getBinding('vectors.uint16Property');
    expect(nodeVectorUInt16).toBeInstanceOf(VectorUInt16Binding);

    const nodeVectorUInt32 = bindingRoot.getBinding('vectors.uint32Property');
    expect(nodeVectorUInt32).toBeInstanceOf(VectorUInt32Binding);

    const nodeVectorUInt64 = bindingRoot.getBinding('vectors.uint64Property');
    expect(nodeVectorUInt64).toBeInstanceOf(VectorUInt64Binding);

    const nodeVectorDouble = bindingRoot.getBinding('vectors.doubleProperty');
    expect(nodeVectorDouble).toBeInstanceOf(VectorDoubleBinding);

    const image = bindingRoot.getBinding('output.schema.node.image');
    expect(image).toBeInstanceOf(ImageBinding);

    const slot = bindingRoot.getBinding('startWritingOutput');
    expect(slot).toBeInstanceOf(SlotBinding);
  });

  it('StringBinding', () => {
    const stringBinding = new StringBinding();
    stringBinding.setValue('2', undefined);
    expect(stringBinding.value).toStrictEqual(new types.StringValue('2'));
    stringBinding.setValue(3, undefined);
    expect(stringBinding.value).toStrictEqual(new types.StringValue('3'));
    stringBinding.setValue(4.1, undefined);
    expect(stringBinding.value).toStrictEqual(new types.StringValue('4.1'));
  });

  it('UInt8Binding', () => {
    const uint8Binding = new UInt8Binding();
    uint8Binding.setValue('2', undefined);
    expect(uint8Binding.value).toStrictEqual(new types.UInt8Value(2));
    uint8Binding.setValue(3, undefined);
    expect(uint8Binding.value).toStrictEqual(new types.UInt8Value(3));
    expect(() => uint8Binding.setValue(4.1, undefined)).toThrow(
      'Value must be an integer. Given: 4.1'
    );
    expect(() => uint8Binding.setValue('4.1', undefined)).toThrow(
      'Value must be an integer. Given: 4.1'
    );
    expect(() => uint8Binding.setValue(-1, undefined)).toThrow(
      'Value out of bounds (0 to 255). Given: -1'
    );
    expect(() => uint8Binding.setValue(256, undefined)).toThrow(
      'Value out of bounds (0 to 255). Given: 256'
    );
  });

  it('UInt16Binding', () => {
    const binding = new UInt16Binding();
    binding.setValue('2', undefined);
    expect(binding.value).toStrictEqual(new types.UInt16Value(2));
    binding.setValue(3, undefined);
    expect(binding.value).toStrictEqual(new types.UInt16Value(3));

    expect(() => binding.setValue(4.1, undefined)).toThrow(
      'Value must be an integer. Given: 4.1'
    );
    expect(() => binding.setValue('4.1', undefined)).toThrow(
      'Value must be an integer. Given: 4.1'
    );
    expect(() => binding.setValue(-1, undefined)).toThrow(
      'Value out of bounds (0 to 65535). Given: -1'
    );
    expect(() => binding.setValue(65536, undefined)).toThrow(
      'Value out of bounds (0 to 65535). Given: 65536'
    );
  });

  it('UInt32Binding', () => {
    const binding = new UInt32Binding();
    binding.setValue('2', undefined);
    expect(binding.value).toStrictEqual(new types.UInt32Value(2));
    binding.setValue(3, undefined);
    expect(binding.value).toStrictEqual(new types.UInt32Value(3));

    expect(() => binding.setValue(4.1, undefined)).toThrow(
      'Value must be an integer. Given: 4.1'
    );
    expect(() => binding.setValue(-1, undefined)).toThrow(
      'Value out of bounds (0 to 4294967295). Given: -1'
    );
    expect(() => binding.setValue(4294967296, undefined)).toThrow(
      'Value out of bounds (0 to 4294967295). Given: 4294967296'
    );
  });

  it('UInt64Binding', () => {
    const binding = new UInt64Binding();
    binding.setValue('2', undefined);
    expect(binding.value).toStrictEqual(new types.UInt64Value(2n));
    binding.setValue(3n, undefined);
    expect(binding.value).toStrictEqual(new types.UInt64Value(3n));

    // BigInt() natively throws on decimals during parsing
    expect(() => binding.setValue('4.1', undefined)).toThrow(
      'Value must be a valid 64-bit integer. Given: 4.1'
    );
    // 2n ** 64n - 1n evaluates to 18446744073709551615
    expect(() => binding.setValue(-1, undefined)).toThrow(
      'Value out of bounds (0 to 18446744073709551615). Given: -1'
    );
  });

  it('Int8Binding', () => {
    const binding = new Int8Binding();
    binding.setValue('-2', undefined);
    expect(binding.value).toStrictEqual(new types.Int8Value(-2));
    binding.setValue(3, undefined);
    expect(binding.value).toStrictEqual(new types.Int8Value(3));

    expect(() => binding.setValue(4.1, undefined)).toThrow(
      'Value must be an integer. Given: 4.1'
    );
    expect(() => binding.setValue(-129, undefined)).toThrow(
      'Value out of bounds (-128 to 127). Given: -129'
    );
    expect(() => binding.setValue(128, undefined)).toThrow(
      'Value out of bounds (-128 to 127). Given: 128'
    );
  });

  it('Int16Binding', () => {
    const binding = new Int16Binding();
    binding.setValue('-2', undefined);
    expect(binding.value).toStrictEqual(new types.Int16Value(-2));
    binding.setValue(3, undefined);
    expect(binding.value).toStrictEqual(new types.Int16Value(3));

    expect(() => binding.setValue(4.1, undefined)).toThrow(
      'Value must be an integer. Given: 4.1'
    );
    expect(() => binding.setValue(-32769, undefined)).toThrow(
      'Value out of bounds (-32768 to 32767). Given: -32769'
    );
    expect(() => binding.setValue(32768, undefined)).toThrow(
      'Value out of bounds (-32768 to 32767). Given: 32768'
    );
  });

  it('Int32Binding', () => {
    const binding = new Int32Binding();
    binding.setValue('-2', undefined);
    expect(binding.value).toStrictEqual(new types.Int32Value(-2));
    binding.setValue(3, undefined);
    expect(binding.value).toStrictEqual(new types.Int32Value(3));

    expect(() => binding.setValue(4.1, undefined)).toThrow(
      'Value must be an integer. Given: 4.1'
    );
    expect(() => binding.setValue(-2147483649, undefined)).toThrow(
      'Value out of bounds (-2147483648 to 2147483647). Given: -2147483649'
    );
    expect(() => binding.setValue(2147483648, undefined)).toThrow(
      'Value out of bounds (-2147483648 to 2147483647). Given: 2147483648'
    );
  });

  it('Int64Binding', () => {
    const binding = new Int64Binding();
    binding.setValue('-2', undefined);
    expect(binding.value).toStrictEqual(new types.Int64Value(-2n));
    binding.setValue(3n, undefined);
    expect(binding.value).toStrictEqual(new types.Int64Value(3n));

    expect(() => binding.setValue('4.1', undefined)).toThrow(
      'Value must be a valid 64-bit integer. Given: 4.1'
    );
  });

  it('FloatBinding', () => {
    const binding = new FloatBinding();
    // Floats accept decimals
    binding.setValue('4.1', undefined);
    expect(binding.value).toStrictEqual(new types.FloatValue(4.1));
    binding.setValue(-4.1, undefined);
    expect(binding.value).toStrictEqual(new types.FloatValue(-4.1));
    binding.setValue(3, undefined);
    expect(binding.value).toStrictEqual(new types.FloatValue(3.0));

    // Floats reject non-numeric strings
    expect(() => binding.setValue('abc', undefined)).toThrow(
      'Value must be a valid number. Given: abc'
    );
  });

  it('DoubleBinding', () => {
    const binding = new DoubleBinding();
    binding.setValue('4.123456789', undefined);
    expect(binding.value).toStrictEqual(new types.DoubleValue(4.123456789));
    binding.setValue(-4.1, undefined);
    expect(binding.value).toStrictEqual(new types.DoubleValue(-4.1));
    binding.setValue(new types.DoubleValue(-4.1), undefined);
    expect(binding.value).toStrictEqual(new types.DoubleValue(-4.1));
    expect(() => binding.setValue('abc', undefined)).toThrow(
      'Value must be a valid number. Given: abc'
    );
  });

  // Total
});
