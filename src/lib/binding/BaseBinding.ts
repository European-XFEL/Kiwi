import { State } from '@/karabo/data/State';
import { AccessLevel, AccessMode, Assignment } from '@/karabo/data/enums';
import { Timestamp } from '@/karabo/data/timestamp';
import { HashAttributes, Schema } from '@/karabo/data/hash';
import { HashTypes, XmlTypeToHashType } from '@/karabo/data/typenums';
import { WeakEvent } from '../WeakEvent';
import { buildNode } from '@/lib/binding/BindingFactory';

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

export class BaseBinding<TValue = any> {
  protected _attributes!: HashAttributes;

  value_update = new WeakEvent();

  hashType = HashTypes.Hash;

  timestamp?: Timestamp;
  value: TValue | undefined = undefined;

  displayedName = '';
  displayType = '';
  accessMode: AccessMode = AccessMode.UNDEFINED;
  assignment: Assignment = Assignment.OPTIONAL;
  options: any[] = [];
  requiredAccessLevel: AccessLevel = AccessLevel.OBSERVER;
  unit_label = '';

  // Keep placeholder
  rowSchema?: any;

  constructor(opts?: {
    attributes?: HashAttributes;
    value?: TValue | undefined;
  }) {
    const attrs = opts?.attributes ?? new HashAttributes();
    if (opts && 'value' in opts) this.value = opts.value as TValue | undefined;
    this.attributes = attrs;
  }

  get attributes(): HashAttributes {
    return this._attributes;
  }

  set attributes(v: HashAttributes) {
    this._attributes = v;
    this._update_shortcuts(this._attributes);
  }

  public setValue(value: TValue, timestamp: Timestamp | undefined) {
    this.value = value;
    this.timestamp = timestamp ?? new Timestamp();
    this.value_update.fire(value, timestamp);
  }

  is_allowed(state: string | State): boolean {
    const s = typeof state === 'string' ? state : state.name;
    let alloweds: string[] = [];
    if (this._attributes.has(KARABO_SCHEMA_ALLOWED_STATES)) {
      alloweds = this._attributes.getValue(KARABO_SCHEMA_ALLOWED_STATES);
    }
    return alloweds.length === 0 || alloweds.includes(s);
  }

  protected _update_shortcuts(attrs: HashAttributes): void {
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

    if (attrs.has(KARABO_SCHEMA_ROW_SCHEMA)) {
      const schema = attrs.getValue(KARABO_SCHEMA_ROW_SCHEMA) as Schema;
      const bindings: Record<string, BaseBinding> = {};

      for (const [key, _value, a] of schema.hash.iterall()) {
        const node = buildNode(undefined, a);
        bindings[key] = node;
      }
      this.rowSchema = bindings;
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
  value: BindingNamespace;
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
    binding = this.value.get(parts[0]);
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
  constructor(opts?: {
    attributes?: HashAttributes;
    value?: BindingNamespace<BaseBinding>;
  }) {
    super({ attributes: opts?.attributes });
    this.value = opts?.value ?? new BindingNamespace<BaseBinding>();
  }
}
