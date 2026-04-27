import {
  HashType,
  XmlTypeToHashType,
  HashAttributes,
  Schema,
  Timestamp,
  AccessLevel,
  AccessMode,
  Assignment,
  State,
} from '@/karabo/data/api';
import { Signal } from '../utils';
import { buildNode } from './BindingFactory';

import {
  KARABO_SCHEMA_DISPLAYED_NAME,
  KARABO_SCHEMA_DISPLAY_TYPE,
  KARABO_SCHEMA_ACCESS_MODE,
  KARABO_SCHEMA_ASSIGNMENT,
  KARABO_SCHEMA_REQUIRED_ACCESS_LEVEL,
  KARABO_SCHEMA_OPTIONS,
  KARABO_SCHEMA_UNIT_SYMBOL,
  KARABO_SCHEMA_METRIC_PREFIX_SYMBOL,
  KARABO_SCHEMA_ALLOWED_STATES,
  KARABO_SCHEMA_VALUE_TYPE,
  KARABO_SCHEMA_ROW_SCHEMA,
} from '@/karabo/data/const';
import * as types from '@/karabo/data/types';

export class BaseBinding<TValue = any> {
  protected _attributes!: HashAttributes;

  value_update = new Signal<[any, any]>();

  hashType = HashType.Hash;

  timestamp?: Timestamp;
  value: TValue | undefined = undefined;

  displayedName = '';
  displayType = '';
  accessMode: AccessMode = AccessMode.UNDEFINED;
  assignment: Assignment = Assignment.OPTIONAL;
  options: any[] = [];
  requiredAccessLevel: AccessLevel = AccessLevel.OBSERVER;
  unit_label = '';

  constructor(opts?: { attributes?: HashAttributes; value?: any | undefined }) {
    const attrs = opts?.attributes ?? new HashAttributes();
    if (opts && 'value' in opts)
      this.value = opts.value
        ? (this.validate(opts.value) as TValue)
        : undefined;
    this.attributes = attrs;
  }

  get attributes(): HashAttributes {
    return this._attributes;
  }

  set attributes(v: HashAttributes) {
    this._attributes = v;
    this.update_shortcuts(this._attributes);
  }

  public setValue(value: any, timestamp: Timestamp | undefined) {
    value = this.validate(value);
    this.value = value;
    this.timestamp = timestamp ?? new Timestamp();
    this.value_update.fire(value, timestamp);
  }

  protected validate(value: any): TValue | undefined {
    return value;
  }

  is_allowed(state: string | State): boolean {
    const s = typeof state === 'string' ? state : state.name;
    let alloweds: string[] = [];
    if (this._attributes.has(KARABO_SCHEMA_ALLOWED_STATES)) {
      alloweds = this._attributes.getValue(KARABO_SCHEMA_ALLOWED_STATES);
    }
    return alloweds.length === 0 || alloweds.includes(s);
  }

  public update_shortcuts(attrs: HashAttributes): void {
    if (attrs.has(KARABO_SCHEMA_DISPLAYED_NAME)) {
      this.displayedName = attrs.getValue(KARABO_SCHEMA_DISPLAYED_NAME);
    }

    if (attrs.has(KARABO_SCHEMA_DISPLAY_TYPE)) {
      this.displayType = attrs.getValue(KARABO_SCHEMA_DISPLAY_TYPE);
    }

    if (attrs.has(KARABO_SCHEMA_ACCESS_MODE)) {
      const mode = attrs.getValue(KARABO_SCHEMA_ACCESS_MODE);
      this.accessMode = mode as AccessMode;
    }

    if (attrs.has(KARABO_SCHEMA_ASSIGNMENT)) {
      const assign = attrs.getValue(KARABO_SCHEMA_ASSIGNMENT);
      this.assignment = assign as Assignment;
    }

    if (attrs.has(KARABO_SCHEMA_OPTIONS)) {
      this.options = attrs.getValue(KARABO_SCHEMA_OPTIONS);
    }

    if (attrs.has(KARABO_SCHEMA_REQUIRED_ACCESS_LEVEL)) {
      const level = attrs.getValue(KARABO_SCHEMA_REQUIRED_ACCESS_LEVEL);
      this.requiredAccessLevel = level as AccessLevel;
    }

    if (attrs.has(KARABO_SCHEMA_VALUE_TYPE)) {
      const valueType = attrs.getValue(KARABO_SCHEMA_VALUE_TYPE);
      this.hashType = XmlTypeToHashType[valueType];
    }

    if (
      attrs.has(KARABO_SCHEMA_UNIT_SYMBOL) ||
      attrs.has(KARABO_SCHEMA_METRIC_PREFIX_SYMBOL)
    ) {
      const prefix = attrs.has(KARABO_SCHEMA_METRIC_PREFIX_SYMBOL)
        ? attrs.getValue(KARABO_SCHEMA_METRIC_PREFIX_SYMBOL)
        : '';

      const unit = attrs.has(KARABO_SCHEMA_UNIT_SYMBOL)
        ? attrs.getValue(KARABO_SCHEMA_UNIT_SYMBOL)
        : '';

      this.unit_label = `${prefix}${unit}`;
    }
  }
}

export class BindingNamespace<T = any> implements Iterable<string> {
  private readonly names = new Map<string, T>();

  clear_namespace(): void {
    this.names.clear();
  }

  has(key: string): boolean {
    return this.names.has(key);
  }

  set(key: string, value: T): void {
    this.names.set(key, value);
  }

  get(key: string): any {
    const item = this.names.get(key);
    return item;
  }

  [Symbol.iterator](): Iterator<string> {
    return this.names.keys();
  }

  get length(): number {
    return this.names.size;
  }

  entries(): IterableIterator<[string, T]> {
    return this.names.entries();
  }
}

export class BindingRoot extends BaseBinding<BindingNamespace> {
  classId = '';

  constructor(opts?: {
    attributes?: HashAttributes;
    value?: BindingNamespace;
    classId?: string;
  }) {
    super(opts);
    this.value = opts?.value ?? new BindingNamespace();
    if (opts?.classId != null) this.classId = opts.classId;
  }

  public getBinding(path: string): BaseBinding | undefined {
    const parts = path.split('.').map((p) => p.trim());

    let binding: BaseBinding;
    binding = this.value!.get(parts[0]);
    if (!binding) {
      return undefined;
    }
    for (let i = 1; i < parts.length; i++) {
      const ns = binding.value;
      if (!(ns instanceof BindingNamespace)) {
        throw new Error(
          `getBinding(): "${parts.slice(0, i).join('.')}" is not a node"`
        );
      }
      binding = ns.get(parts[i]);
      if (!binding) {
        return undefined;
      }
    }

    return binding;
  }
}

export class NodeBinding extends BaseBinding<BindingNamespace<BaseBinding>> {
  value: BindingNamespace<BaseBinding>;

  constructor(opts?: {
    attributes?: HashAttributes;
    value?: BindingNamespace<BaseBinding>;
  }) {
    super({ attributes: opts?.attributes });
    this.value = opts?.value ?? new BindingNamespace<BaseBinding>();
  }
}

export class VectorHashBinding extends BaseBinding<any> {
  private _cachedRowSchema?: Record<string, BaseBinding>;

  get rowSchema(): Record<string, BaseBinding> | undefined {
    if (this._cachedRowSchema) {
      return this._cachedRowSchema;
    }
    const schema = this.attributes.getValue<Schema>(KARABO_SCHEMA_ROW_SCHEMA);
    const bindings: Record<string, BaseBinding<any>> = {};
    for (const [key, _value, a] of schema.hash.iterall()) {
      bindings[key] = buildNode(undefined, a);
    }
    this._cachedRowSchema = bindings;
    return bindings;
  }

  public override update_shortcuts(attrs: HashAttributes): void {
    super.update_shortcuts(attrs);
    // Invalidate cache when complete reassignments happen
    this._cachedRowSchema = undefined;
  }
}

export class StringBinding extends BaseBinding<types.StringValue> {
  protected override validate(value: any): types.StringValue {
    return types.StringValue.cast(value);
  }
}

export class BoolBinding extends BaseBinding<types.BoolValue> {
  protected override validate(value: any): types.BoolValue {
    return types.BoolValue.cast(value);
  }
}

export class CharBinding extends BaseBinding<types.CharValue> {}

export class UInt8Binding extends BaseBinding<types.UInt8Value> {
  protected override validate(v: any): types.UInt8Value {
    return types.UInt8Value.cast(v);
  }
}

export class UInt16Binding extends BaseBinding<types.UInt16Value> {
  protected override validate(v: any): types.UInt16Value {
    return types.UInt16Value.cast(v);
  }
}

export class UInt32Binding extends BaseBinding<types.UInt32Value> {
  protected override validate(v: any): types.UInt32Value {
    return types.UInt32Value.cast(v);
  }
}

export class UInt64Binding extends BaseBinding<types.UInt64Value> {
  protected override validate(v: any): types.UInt64Value {
    return types.UInt64Value.cast(v);
  }
}

export class Int8Binding extends BaseBinding<types.Int8Value> {
  protected override validate(v: any): types.Int8Value {
    return types.Int8Value.cast(v);
  }
}

export class Int16Binding extends BaseBinding<types.Int16Value> {
  protected override validate(v: any): types.Int16Value {
    return types.Int16Value.cast(v);
  }
}

export class Int32Binding extends BaseBinding<types.Int32Value> {
  protected override validate(v: any): types.Int32Value {
    return types.Int32Value.cast(v);
  }
}

export class Int64Binding extends BaseBinding<types.Int64Value> {
  protected override validate(v: any): types.Int64Value {
    return types.Int64Value.cast(v);
  }
}

export class FloatBinding extends BaseBinding<types.FloatValue> {
  protected override validate(v: any): types.FloatValue {
    return types.FloatValue.cast(v);
  }
}

export class DoubleBinding extends BaseBinding<types.DoubleValue> {
  protected override validate(v: any): types.DoubleValue {
    return types.DoubleValue.cast(v);
  }
}

export class ByteArrayBinding extends BaseBinding<types.VectorCharValue> {}
export class VectorStringBinding extends BaseBinding<types.VectorStringValue> {}
export class VectorBoolBinding extends BaseBinding<types.VectorBoolValue> {}
export class VectorFloatBinding extends BaseBinding<types.VectorFloatValue> {}
export class VectorDoubleBinding extends BaseBinding<types.VectorDoubleValue> {}

export class VectorUInt8Binding extends BaseBinding<types.VectorUInt8Value> {}
export class VectorUInt16Binding extends BaseBinding<types.VectorUInt16Value> {}
export class VectorUInt32Binding extends BaseBinding<types.VectorUInt32Value> {}
export class VectorUInt64Binding extends BaseBinding<types.VectorUInt64Value> {}

export class VectorInt8Binding extends BaseBinding<types.VectorInt8Value> {}
export class VectorInt16Binding extends BaseBinding<types.VectorInt16Value> {}
export class VectorInt32Binding extends BaseBinding<types.VectorInt32Value> {}
export class VectorInt64Binding extends BaseBinding<types.VectorInt64Value> {}

export class SlotBinding extends NodeBinding {}
export class ImageBinding extends NodeBinding {}
