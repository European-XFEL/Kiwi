import {
  AccessLevel,
  AccessMode,
  Assignment,
  Hash,
  HashAttributes,
  HashType,
  HashTypeToXmlType,
  NodeType,
  Unit,
  MetricPrefix,
  Schema,
} from '@/karabo/data/api';

type Attributes = HashAttributes | Record<string, unknown>;

export abstract class Element {
  static defaults: Record<string, unknown> = {
    displayedName: undefined,
    alias: undefined,
    description: undefined,
    defaultValue: undefined,
    options: undefined,
    accessMode: AccessMode.RECONFIGURABLE,
    assignment: Assignment.OPTIONAL,
    displayType: undefined,
    requiredAccessLevel: undefined,
    archivePolicy: undefined,
    allowedStates: undefined,
    tags: undefined,
    classId: undefined,
  };

  public attributes: HashAttributes;

  constructor(attributes?: Attributes) {
    this.attributes = new HashAttributes(attributes);
  }

  protected schemaAttributes(nodeType: NodeType): HashAttributes {
    const ElementClass = this.constructor as typeof Element;
    const attributes = new HashAttributes();
    for (const [key, value] of Object.entries(ElementClass.defaults)) {
      if (value !== undefined) attributes.set(key, value);
    }
    for (const [key, value] of this.attributes) attributes.set(key, value);
    if (!attributes.has('requiredAccessLevel')) {
      const mode = attributes.getValue('accessMode');
      const operator =
        nodeType === NodeType.Leaf &&
        (mode === AccessMode.RECONFIGURABLE || mode === AccessMode.INITONLY);
      attributes.set(
        'requiredAccessLevel',
        operator ? AccessLevel.OPERATOR : AccessLevel.OBSERVER
      );
    }
    attributes.set('nodeType', nodeType);
    return attributes;
  }

  abstract toSchemaAndAttrs(): [Hash, HashAttributes];
}

export abstract class TypeElement extends Element {
  static override defaults: Record<string, unknown> = {
    ...Element.defaults,
    unitSymbol: Unit.NUMBER,
    metricPrefixSymbol: MetricPrefix.NONE,
  };
  static valueType: HashType;

  toSchemaAndAttrs(): [Hash, HashAttributes] {
    const ElementClass = this.constructor as typeof TypeElement;
    const attributes = this.schemaAttributes(NodeType.Leaf);
    attributes.set('valueType', HashTypeToXmlType[ElementClass.valueType]);
    return [new Hash(), attributes];
  }
}

export abstract class VectorElement extends TypeElement {
  static override defaults: Record<string, unknown> = {
    ...TypeElement.defaults,
    minSize: undefined,
    maxSize: undefined,
  };
}

export class StringElement extends TypeElement {
  static override valueType = HashType.String;
}

export class BoolElement extends TypeElement {
  static override valueType = HashType.Bool;
}

export class CharElement extends TypeElement {
  static override valueType = HashType.Char;
}

export class ByteArrayElement extends VectorElement {
  static override valueType = HashType.ByteArray;
}

export class Int8Element extends TypeElement {
  static override valueType = HashType.Int8;
}

export class UInt8Element extends TypeElement {
  static override valueType = HashType.UInt8;
}

export class Int16Element extends TypeElement {
  static override valueType = HashType.Int16;
}

export class UInt16Element extends TypeElement {
  static override valueType = HashType.UInt16;
}

export class Int32Element extends TypeElement {
  static override valueType = HashType.Int32;
}

export class UInt32Element extends TypeElement {
  static override valueType = HashType.UInt32;
}

export class Int64Element extends TypeElement {
  static override valueType = HashType.Int64;
}

export class UInt64Element extends TypeElement {
  static override valueType = HashType.UInt64;
}

export class FloatElement extends TypeElement {
  static override valueType = HashType.Float;
}

export class DoubleElement extends TypeElement {
  static override valueType = HashType.Double;
}

export class VectorBoolElement extends VectorElement {
  static override valueType = HashType.VectorBool;
}

export class VectorStringElement extends VectorElement {
  static override valueType = HashType.VectorString;
}

export class VectorInt8Element extends VectorElement {
  static override valueType = HashType.VectorInt8;
}

export class VectorUInt8Element extends VectorElement {
  static override valueType = HashType.VectorUInt8;
}

export class VectorInt16Element extends VectorElement {
  static override valueType = HashType.VectorInt16;
}

export class VectorUInt16Element extends VectorElement {
  static override valueType = HashType.VectorUInt16;
}

export class VectorInt32Element extends VectorElement {
  static override valueType = HashType.VectorInt32;
}

export class VectorUInt32Element extends VectorElement {
  static override valueType = HashType.VectorUInt32;
}

export class VectorInt64Element extends VectorElement {
  static override valueType = HashType.VectorInt64;
}

export class VectorUInt64Element extends VectorElement {
  static override valueType = HashType.VectorUInt64;
}

export class VectorFloatElement extends VectorElement {
  static override valueType = HashType.VectorFloat;
}

export class VectorDoubleElement extends VectorElement {
  static override valueType = HashType.VectorDouble;
}

export class VectorHashElement extends VectorElement {
  static override valueType = HashType.VectorHash;
  static override defaults: Record<string, unknown> = {
    ...VectorElement.defaults,
    displayType: 'Table',
    rowSchema: undefined,
  };
}

export class NodeElement extends Element {
  static override defaults: Record<string, unknown> = {
    ...Element.defaults,
    nodeType: NodeType.Node,
    requiredAccessLevel: AccessLevel.OBSERVER,
  };

  constructor(
    private configurable: typeof Configurable,
    attributes?: Attributes
  ) {
    super(attributes);
  }

  toSchemaAndAttrs(): [Hash, HashAttributes] {
    return [
      this.configurable.getClassSchema().hash,
      this.schemaAttributes(NodeType.Node),
    ];
  }
}

export class SlotElement extends NodeElement {
  static override defaults: Record<string, unknown> = {
    ...NodeElement.defaults,
    requiredAccessLevel: AccessLevel.OPERATOR,
  };

  constructor(attributes?: Attributes) {
    super(Configurable, attributes);
  }

  toSchemaAndAttrs(): [Hash, HashAttributes] {
    const [value, attributes] = super.toSchemaAndAttrs();
    attributes.set('displayType', 'Slot');
    attributes.set('classId', 'Slot');
    return [value, attributes];
  }
}

export class Configurable {
  static getClassSchema(): Schema {
    const classes: (typeof Configurable)[] = [this];
    while (classes[0] !== Configurable) {
      classes.unshift(Object.getPrototypeOf(classes[0]));
    }

    const elements = new Map<string, Element>();
    for (const configurable of classes) {
      for (const [key, descriptor] of Object.entries(
        Object.getOwnPropertyDescriptors(configurable)
      )) {
        if (descriptor.value instanceof Element) {
          elements.set(key, descriptor.value);
        }
      }
    }

    const hash = new Hash();
    for (const [key, element] of elements) {
      const [value, attributes] = element.toSchemaAndAttrs();
      hash.setElement(key, value, attributes);
    }
    return new Schema(this.name, hash);
  }
}

class NDArray extends Configurable {
  static data = new ByteArrayElement({
    displayedName: 'Data',
    accessMode: AccessMode.READONLY,
  });
  static shape = new VectorUInt64Element({
    displayedName: 'Shape',
    defaultValue: [],
    accessMode: AccessMode.READONLY,
  });
  static type = new Int32Element({
    displayedName: 'Data Type',
    accessMode: AccessMode.READONLY,
  });
  static isBigEndian = new BoolElement({
    displayedName: 'Is big-endian',
    accessMode: AccessMode.READONLY,
  });
}

export class NDArrayElement extends NodeElement {
  static override defaults: Record<string, unknown> = {
    ...NodeElement.defaults,
    classId: 'NDArray',
  };

  constructor(attributes?: Attributes) {
    super(NDArray, attributes);
  }
}

class ImageNode extends Configurable {
  static pixels = new NDArrayElement({
    displayedName: 'Pixels',
    description: 'The N-dimensional array containing the pixels',
    accessMode: AccessMode.READONLY,
  });
  static dims = new VectorUInt64Element({
    displayedName: 'Dimensions',
    description:
      'The length of the array reflects total dimensionality ' +
      'and each element the extension in this dimension',
    maxSize: 8,
    accessMode: AccessMode.READONLY,
  });
  static encoding = new Int32Element({
    displayedName: 'Encoding',
    description:
      'Describes the color space of pixel encoding of the data' +
      '(e.g. GRAY, RGB, JPG, PNG etc.',
    accessMode: AccessMode.READONLY,
  });
  static bitsPerPixel = new Int32Element({
    displayedName: 'Bits per pixel',
    description: 'The number of bits needed for each pixel',
    accessMode: AccessMode.READONLY,
  });
  static roiOffsets = new VectorUInt64Element({
    displayedName: 'ROI Offsets',
    description:
      'Describes the offset of the Region-of-Interest. It will' +
      'contain zeros if the image has no ROI defined',
    maxSize: 8,
    accessMode: AccessMode.READONLY,
  });
  static binning = new VectorUInt64Element({
    displayedName: 'Binning',
    description:
      'The number of binned adjacent pixels. They ' +
      'are reported out of the camera as a single pixel.',
    maxSize: 8,
    accessMode: AccessMode.READONLY,
  });
  static rotation = new Int32Element({
    displayedName: 'Rotation',
    description: 'The image counterclockwise rotation.',
    options: [0, 90, 180, 270],
    unitSymbol: Unit.DEGREE,
    accessMode: AccessMode.READONLY,
  });
  static flipX = new BoolElement({
    displayedName: 'Flip X',
    description: 'Image horizontal flip.',
    accessMode: AccessMode.READONLY,
  });
  static flipY = new BoolElement({
    displayedName: 'Flip Y',
    description: 'Image vertical flip.',
    accessMode: AccessMode.READONLY,
  });
}

export class ImageElement extends NodeElement {
  static override defaults: Record<string, unknown> = {
    ...NodeElement.defaults,
    classId: 'ImageData',
    displayType: 'ImageData',
    defaultValue: new Hash(),
  };

  constructor(attributes?: Attributes) {
    super(ImageNode, attributes);
  }
}
