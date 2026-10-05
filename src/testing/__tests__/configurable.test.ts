import {
  AccessLevel,
  AccessMode,
  Assignment,
  Hash,
  HashAttributes,
  HashType,
  NodeType,
  Unit,
  MetricPrefix,
} from '@/karabo/data/api';
import * as bindings from '@/lib/binding/BaseBinding';
import { buildBinding } from '@/lib/binding/BindingFactory';
import * as elements from '../configurable';
import {
  Configurable,
  Int32Element,
  StringElement,
  BoolElement,
  NodeElement,
  SlotElement,
  NDArrayElement,
  ImageElement,
  VectorHashElement,
  VectorInt32Element,
} from '../configurable';

const leafCases = [
  [elements.StringElement, 'STRING', bindings.StringBinding, HashType.String],
  [elements.BoolElement, 'BOOL', bindings.BoolBinding, HashType.Bool],
  [elements.CharElement, 'CHAR', bindings.CharBinding, HashType.Char],
  [
    elements.ByteArrayElement,
    'BYTE_ARRAY',
    bindings.BaseBinding,
    HashType.ByteArray,
  ],
  [elements.Int8Element, 'INT8', bindings.Int8Binding, HashType.Int8],
  [elements.UInt8Element, 'UINT8', bindings.UInt8Binding, HashType.UInt8],
  [elements.Int16Element, 'INT16', bindings.Int16Binding, HashType.Int16],
  [elements.UInt16Element, 'UINT16', bindings.UInt16Binding, HashType.UInt16],
  [elements.Int32Element, 'INT32', bindings.Int32Binding, HashType.Int32],
  [elements.UInt32Element, 'UINT32', bindings.UInt32Binding, HashType.UInt32],
  [elements.Int64Element, 'INT64', bindings.Int64Binding, HashType.Int64],
  [elements.UInt64Element, 'UINT64', bindings.UInt64Binding, HashType.UInt64],
  [elements.FloatElement, 'FLOAT', bindings.FloatBinding, HashType.Float],
  [elements.DoubleElement, 'DOUBLE', bindings.DoubleBinding, HashType.Double],
  [
    elements.VectorBoolElement,
    'VECTOR_BOOL',
    bindings.VectorBoolBinding,
    HashType.VectorBool,
  ],
  [
    elements.VectorStringElement,
    'VECTOR_STRING',
    bindings.VectorStringBinding,
    HashType.VectorString,
  ],
  [
    elements.VectorInt8Element,
    'VECTOR_INT8',
    bindings.VectorInt8Binding,
    HashType.VectorInt8,
  ],
  [
    elements.VectorUInt8Element,
    'VECTOR_UINT8',
    bindings.VectorUInt8Binding,
    HashType.VectorUInt8,
  ],
  [
    elements.VectorInt16Element,
    'VECTOR_INT16',
    bindings.VectorInt16Binding,
    HashType.VectorInt16,
  ],
  [
    elements.VectorUInt16Element,
    'VECTOR_UINT16',
    bindings.VectorUInt16Binding,
    HashType.VectorUInt16,
  ],
  [
    elements.VectorInt32Element,
    'VECTOR_INT32',
    bindings.VectorInt32Binding,
    HashType.VectorInt32,
  ],
  [
    elements.VectorUInt32Element,
    'VECTOR_UINT32',
    bindings.VectorUInt32Binding,
    HashType.VectorUInt32,
  ],
  [
    elements.VectorInt64Element,
    'VECTOR_INT64',
    bindings.VectorInt64Binding,
    HashType.VectorInt64,
  ],
  [
    elements.VectorUInt64Element,
    'VECTOR_UINT64',
    bindings.VectorUInt64Binding,
    HashType.VectorUInt64,
  ],
  [
    elements.VectorFloatElement,
    'VECTOR_FLOAT',
    bindings.VectorFloatBinding,
    HashType.VectorFloat,
  ],
  [
    elements.VectorDoubleElement,
    'VECTOR_DOUBLE',
    bindings.VectorDoubleBinding,
    HashType.VectorDouble,
  ],
  [
    elements.VectorHashElement,
    'VECTOR_HASH',
    bindings.VectorHashBinding,
    HashType.VectorHash,
  ],
] as const;

describe('Configurable schema generation', () => {
  it('declares optional class defaults without emitting undefined attributes', () => {
    expect(elements.Element.defaults.classId).toBeUndefined();
    expect(elements.Element.defaults.alias).toBeUndefined();
    expect(elements.Element.defaults.tags).toBeUndefined();
    expect(elements.Element.defaults.options).toBeUndefined();
    const [, attrs] = new StringElement().toSchemaAndAttrs();
    for (const key of ['classId', 'alias', 'tags', 'options']) {
      expect(attrs.has(key)).toBe(false);
    }
    expect(
      new StringElement({ classId: 'Custom' })
        .toSchemaAndAttrs()[1]
        .getValue('classId')
    ).toBe('Custom');
  });

  it('inherits class defaults and lets instance attributes override them', () => {
    class DistanceElement extends Int32Element {
      static override defaults = {
        ...Int32Element.defaults,
        unitSymbol: Unit.METER,
        classId: 'Distance',
      };
    }
    const [, defaults] = new DistanceElement().toSchemaAndAttrs();
    expect(defaults.getValue('unitSymbol')).toBe(Unit.METER);
    expect(defaults.getValue('classId')).toBe('Distance');
    expect(defaults.getValue('assignment')).toBe(Assignment.OPTIONAL);
    const [, overridden] = new DistanceElement({
      unitSymbol: Unit.SECOND,
      classId: 'Time',
    }).toSchemaAndAttrs();
    expect(overridden.getValue('unitSymbol')).toBe(Unit.SECOND);
    expect(overridden.getValue('classId')).toBe('Time');
    expect(DistanceElement.defaults.classId).toBe('Distance');
  });

  it('names empty schemas after the class', () => {
    class Empty extends Configurable {}
    expect(Empty.getClassSchema().name).toBe('Empty');
    expect(Empty.getClassSchema().hash.size).toBe(0);
    expect(Configurable.getClassSchema().name).toBe('Configurable');
  });

  it('collects inherited declarations in order and replaces overridden elements', () => {
    class Base extends Configurable {
      static first = new Int32Element();
      static replaced = new StringElement();
      static ignored = 'metadata';
      static get getter() {
        throw new Error('Static getters should not be evaluated');
      }
    }
    class Middle extends Base {
      static middle = new BoolElement();
    }
    class Derived extends Middle {
      static replaced = new Int32Element({ displayedName: 'Replacement' });
      static last = new StringElement();
    }
    const schema = Derived.getClassSchema();
    expect(schema.name).toBe('Derived');
    expect([...schema.hash.keys()]).toEqual([
      'first',
      'replaced',
      'middle',
      'last',
    ]);
    expect(schema.hash.getAttributeValue('replaced', 'valueType')).toBe(
      'INT32'
    );
    expect(schema.hash.getAttributeValue('replaced', 'displayedName')).toBe(
      'Replacement'
    );
    expect(
      Base.getClassSchema().hash.getAttributeValue('replaced', 'valueType')
    ).toBe('STRING');
  });

  it.each(leafCases)(
    'builds %p with %s metadata',
    (Element, valueType, Binding, hashType) => {
      class Fixture extends Configurable {
        static leaf = new Element();
      }
      const schema = Fixture.getClassSchema();
      expect(schema.hash.getValue('leaf')).toBeInstanceOf(Hash);
      expect(schema.hash.getValue<Hash>('leaf').size).toBe(0);
      const attrs = schema.hash.getAttributes('leaf');
      expect(attrs.getValue('nodeType')).toBe(NodeType.Leaf);
      expect(attrs.getValue('valueType')).toBe(valueType);
      expect(attrs.getValue('unitSymbol')).toBe(Unit.NUMBER);
      expect(attrs.getValue('metricPrefixSymbol')).toBe(MetricPrefix.NONE);
      expect(Fixture.leaf).toBeInstanceOf(elements.TypeElement);
      if (valueType.startsWith('VECTOR_') || valueType === 'BYTE_ARRAY') {
        expect(Fixture.leaf).toBeInstanceOf(elements.VectorElement);
      }
      expect(attrs.getValue('accessMode')).toBe(AccessMode.RECONFIGURABLE);
      expect(attrs.getValue('assignment')).toBe(Assignment.OPTIONAL);
      expect(attrs.getValue('requiredAccessLevel')).toBe(AccessLevel.OPERATOR);
      const binding = buildBinding(schema).getBinding('leaf');
      expect(binding).toBeInstanceOf(Binding);
      expect(binding!.hashType).toBe(hashType);
    }
  );

  it.each([
    [AccessMode.RECONFIGURABLE, AccessLevel.OPERATOR],
    [AccessMode.INITONLY, AccessLevel.OPERATOR],
    [AccessMode.READONLY, AccessLevel.OBSERVER],
    [AccessMode.UNDEFINED, AccessLevel.OBSERVER],
  ])('defaults leaf access level for access mode %s', (accessMode, level) => {
    const [, attrs] = new Int32Element({ accessMode }).toSchemaAndAttrs();
    expect(attrs.getValue('requiredAccessLevel')).toBe(level);
  });

  it.each(['record', 'HashAttributes'])(
    'preserves supplied %s attributes and generates structural metadata',
    (form) => {
      const supplied = {
        accessMode: AccessMode.READONLY,
        assignment: Assignment.MANDATORY,
        requiredAccessLevel: AccessLevel.OBSERVER,
        displayedName: '',
        custom: false,
        classId: 'Custom',
        alias: 'alternateName',
        tags: ['test', 'fixture'],
        unitSymbol: Unit.METER,
        metricPrefixSymbol: MetricPrefix.MILLI,
        defaultValue: 0,
        minInc: 10,
        nodeType: NodeType.Node,
        valueType: 'STRING',
      };
      const input = form === 'record' ? supplied : new HashAttributes(supplied);
      const element = new Int32Element(input);
      const [, attrs] = element.toSchemaAndAttrs();
      expect(element.attributes).toBeInstanceOf(HashAttributes);
      for (const [key, value] of Object.entries(supplied)) {
        if (key !== 'nodeType' && key !== 'valueType') {
          expect(attrs.getValue(key)).toEqual(value);
        }
      }
      expect(attrs.getValue('nodeType')).toBe(NodeType.Leaf);
      expect(attrs.getValue('valueType')).toBe('INT32');
      expect(element.attributes.getValue('nodeType')).toBe(NodeType.Node);
      expect(
        new BoolElement({ defaultValue: false })
          .toSchemaAndAttrs()[1]
          .getValue('defaultValue')
      ).toBe(false);
      expect(
        new StringElement({ defaultValue: '' })
          .toSchemaAndAttrs()[1]
          .getValue('defaultValue')
      ).toBe('');
    }
  );

  it('embeds nested nodes and supports specialized display types and slots', () => {
    class Nested extends Configurable {
      static count = new Int32Element({ defaultValue: 0 });
    }
    class Fixture extends Configurable {
      static nested = new NodeElement(Nested, { displayedName: 'Nested' });
      static image = new NodeElement(Nested, { displayType: 'ImageData' });
      static slot = new SlotElement();
      static customSlot = new SlotElement({
        requiredAccessLevel: AccessLevel.EXPERT,
      });
    }
    const schema = Fixture.getClassSchema();
    expect(Fixture.slot).toBeInstanceOf(NodeElement);
    expect(SlotElement.defaults.nodeType).toBe(NodeType.Node);
    expect(schema.hash.getAttributeValue('nested', 'nodeType')).toBe(
      NodeType.Node
    );
    expect(schema.hash.getAttributeValue('image', 'nodeType')).toBe(
      NodeType.Node
    );
    expect(schema.hash.getAttributeValue('slot', 'nodeType')).toBe(
      NodeType.Node
    );
    expect(schema.hash.getAttributeValue('nested', 'requiredAccessLevel')).toBe(
      AccessLevel.OBSERVER
    );
    expect(schema.hash.getAttributeValue('nested', 'accessMode')).toBe(
      AccessMode.RECONFIGURABLE
    );
    expect(schema.hash.getAttributeValue('nested', 'assignment')).toBe(
      Assignment.OPTIONAL
    );
    expect(schema.hash.getAttributeValue('nested', 'displayedName')).toBe(
      'Nested'
    );
    expect(schema.hash.getAttributeValue('nested.count', 'defaultValue')).toBe(
      0
    );
    expect(schema.hash.getAttributeValue('slot', 'classId')).toBe('Slot');
    expect(schema.hash.getAttributeValue('slot', 'displayType')).toBe('Slot');
    expect(schema.hash.getAttributeValue('slot', 'requiredAccessLevel')).toBe(
      AccessLevel.OPERATOR
    );
    expect(schema.hash.getValue<Hash>('slot').size).toBe(0);
    expect(
      schema.hash.getAttributeValue('customSlot', 'requiredAccessLevel')
    ).toBe(AccessLevel.EXPERT);
    const binding = buildBinding(schema);
    expect(binding.getBinding('nested')).toBeInstanceOf(bindings.NodeBinding);
    expect(binding.getBinding('nested.count')).toBeInstanceOf(
      bindings.Int32Binding
    );
    expect(binding.getBinding('image')).toBeInstanceOf(bindings.ImageBinding);
    expect(binding.getBinding('slot')).toBeInstanceOf(bindings.SlotBinding);
  });

  it('builds an NDArray node with read-only array children', () => {
    class Fixture extends Configurable {
      static array = new NDArrayElement({ displayedName: 'Array' });
    }
    expect(Fixture.array).toBeInstanceOf(NodeElement);
    expect(NDArrayElement.defaults.nodeType).toBe(NodeType.Node);
    const schema = Fixture.getClassSchema();
    expect(schema.hash.getAttributeValue('array', 'nodeType')).toBe(
      NodeType.Node
    );
    expect(schema.hash.getAttributeValue('array', 'classId')).toBe('NDArray');
    expect(schema.hash.getAttributeValue('array', 'displayedName')).toBe(
      'Array'
    );
    expect([...schema.hash.getValue<Hash>('array').keys()]).toEqual([
      'data',
      'shape',
      'type',
      'isBigEndian',
    ]);
    for (const [key, valueType] of [
      ['data', 'BYTE_ARRAY'],
      ['shape', 'VECTOR_UINT64'],
      ['type', 'INT32'],
      ['isBigEndian', 'BOOL'],
    ]) {
      const attrs = schema.hash.getAttributes(`array.${key}`);
      expect(attrs.getValue('nodeType')).toBe(NodeType.Leaf);
      expect(attrs.getValue('valueType')).toBe(valueType);
      expect(attrs.getValue('accessMode')).toBe(AccessMode.READONLY);
    }
    const binding = buildBinding(schema);
    expect(binding.getBinding('array')).toBeInstanceOf(bindings.NodeBinding);
    expect(binding.getBinding('array.shape')).toBeInstanceOf(
      bindings.VectorUInt64Binding
    );
  });

  it('builds the default image node with pixels and image metadata', () => {
    class Fixture extends Configurable {
      static image = new ImageElement({ displayedName: 'Image' });
    }
    expect(Fixture.image).toBeInstanceOf(NodeElement);
    expect(ImageElement.defaults.nodeType).toBe(NodeType.Node);
    const schema = Fixture.getClassSchema();
    const attrs = schema.hash.getAttributes('image');
    expect(attrs.getValue('nodeType')).toBe(NodeType.Node);
    expect(attrs.getValue('classId')).toBe('ImageData');
    expect(attrs.getValue('displayType')).toBe('ImageData');
    expect(attrs.getValue('displayedName')).toBe('Image');
    expect(attrs.getValue<Hash>('defaultValue').size).toBe(0);
    const image = schema.hash.getValue<Hash>('image');
    expect([...image.keys()]).toEqual([
      'pixels',
      'dims',
      'encoding',
      'bitsPerPixel',
      'roiOffsets',
      'binning',
      'rotation',
      'flipX',
      'flipY',
    ]);
    for (const key of image.keys()) {
      const childAttrs = image.getAttributes(key);
      expect(childAttrs.getValue('accessMode')).toBe(AccessMode.READONLY);
      expect(childAttrs.getValue('description')).toEqual(expect.any(String));
    }
    expect(image.getAttributeValue('pixels', 'classId')).toBe('NDArray');
    expect(image.getAttributeValue('pixels', 'nodeType')).toBe(NodeType.Node);
    for (const key of ['dims', 'roiOffsets', 'binning']) {
      expect(image.getAttributeValue(key, 'valueType')).toBe('VECTOR_UINT64');
      expect(image.getAttributeValue(key, 'maxSize')).toBe(8);
    }
    for (const key of ['encoding', 'bitsPerPixel', 'rotation']) {
      expect(image.getAttributeValue(key, 'valueType')).toBe('INT32');
    }
    for (const key of ['flipX', 'flipY']) {
      expect(image.getAttributeValue(key, 'valueType')).toBe('BOOL');
    }
    expect(Array.from(image.getAttributeValue('rotation', 'options'))).toEqual([
      0, 90, 180, 270,
    ]);
    expect(image.getAttributeValue('rotation', 'unitSymbol')).toBe(Unit.DEGREE);
    const binding = buildBinding(schema);
    expect(binding.getBinding('image')).toBeInstanceOf(bindings.ImageBinding);
    expect(binding.getBinding('image.pixels.shape')).toBeInstanceOf(
      bindings.VectorUInt64Binding
    );
  });

  it('preserves vector size limits and table row schemas with existing wrapping', () => {
    class Row extends Configurable {
      static count = new Int32Element();
    }
    const rowSchema = Row.getClassSchema();
    class Fixture extends Configurable {
      static vector = new VectorInt32Element({
        minSize: 0,
        maxSize: 3,
        defaultValue: [],
      });
      static table = new VectorHashElement({ rowSchema });
    }
    const schema = Fixture.getClassSchema();
    expect(schema.hash.getAttributeValue('vector', 'minSize')).toBe(0);
    expect(schema.hash.getAttributeValue('vector', 'maxSize')).toBe(3);
    expect(schema.hash.getAttributeValue('vector', 'defaultValue')).toEqual([]);
    expect(schema.hash.getAttribute('table', 'rowSchema')).toBe(rowSchema);
    expect(schema.hash.getAttributeValue('table', 'displayType')).toBe('Table');
    const table = buildBinding(schema).getBinding(
      'table'
    ) as bindings.VectorHashBinding;
    expect(table.rowSchema!.count).toBeInstanceOf(bindings.Int32Binding);
    expect(
      new VectorHashElement({ displayType: 'Custom' })
        .toSchemaAndAttrs()[1]
        .getValue('displayType')
    ).toBe('Custom');
  });

  it('creates independent schema hashes and attribute maps on every call', () => {
    class Nested extends Configurable {
      static leaf = new Int32Element({ defaultValue: 0 });
    }
    class Fixture extends Configurable {
      static nested = new NodeElement(Nested);
      static leaf = new StringElement();
      static slot = new SlotElement();
    }
    const first = Fixture.getClassSchema();
    const second = Fixture.getClassSchema();
    expect(first).not.toBe(second);
    expect(first.hash).not.toBe(second.hash);
    for (const path of ['nested', 'nested.leaf', 'leaf', 'slot']) {
      expect(first.hash.getValue(path)).not.toBe(second.hash.getValue(path));
      expect(first.hash.getAttributes(path)).not.toBe(
        second.hash.getAttributes(path)
      );
    }
    first.hash.setAttribute('nested.leaf', 'defaultValue', 99);
    first.hash.getValue<Hash>('nested').erase('leaf');
    expect(second.hash.getAttributeValue('nested.leaf', 'defaultValue')).toBe(
      0
    );
    expect(Nested.leaf.attributes.getValue('defaultValue')).toBe(0);
    expect(Fixture.leaf.attributes.has('nodeType')).toBe(false);
  });
});
