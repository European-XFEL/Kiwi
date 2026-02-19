import { HashTypes, getHashTypeFromValue } from './typenums';
import { KaraboValue, castKaraboValue } from './types';

const SEPARATOR = '.' as const;

export type HashValues = KaraboValue | Hash | Schema | HashList;

export class HashAttributes extends Map<string, HashValues> {
  constructor(
    init?:
      | HashAttributes
      | Map<string, any>
      | Record<string, any>
      | Iterable<[string, any]>
  ) {
    super();

    if (!init) return;

    // Handle Iterable (Map, Array of entries, another HashAttributes instance)
    if (typeof (init as any)[Symbol.iterator] === 'function') {
      for (const [k, v] of init as Iterable<[string, any]>) {
        this.set(k, v);
      }
      return;
    }

    // Handle Record (plain object)
    for (const [k, v] of Object.entries(init as Record<string, any>)) {
      this.set(k, v);
    }
  }

  override get(path: string): any {
    const v = super.get(path);
    if (v === undefined) {
      throw new Error(`KeyError: ${path}`);
    }
    return v;
  }

  override set(key: string, value: any): this {
    return super.set(key, wrapKaraboValue(value));
  }

  // * This is solely used for the deserializer
  public _set_element(key: string, value: any): void {
    super.set(key, value);
  }

  public getValue<T = any>(path: string): T {
    return this.get(path).value_ as T;
  }
}

// ---------------------------------------------------------

function isKaraboValue(v: any): v is HashValues {
  if (v === null) {
    return false;
  }

  return (
    typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, 'type_')
  );
}

export class HashElement {
  // Use Attributes class instead of generic Map
  constructor(
    public data: HashValues,
    public attrs: HashAttributes = new HashAttributes()
  ) {}

  *[Symbol.iterator](): IterableIterator<HashValues | HashAttributes> {
    yield this.data;
    yield this.attrs;
  }

  public equals(other: unknown): boolean {
    if (!(other instanceof HashElement)) {
      return false;
    }
    if (JSON.stringify(this.data) !== JSON.stringify(other.data)) {
      return false;
    }
    if (this.attrs.size !== other.attrs.size) {
      return false;
    }
    for (const [k, v] of this.attrs) {
      if (!other.attrs.has(k)) {
        return false;
      }
      const ov = other.attrs.get(k);
      if (JSON.stringify(v) !== JSON.stringify(ov)) {
        return false;
      }
    }

    return true;
  }
}

export class Hash extends Map<string, HashElement> {
  readonly type_ = HashTypes.Hash;

  public get value_(): Hash {
    return this;
  }
  constructor();
  constructor(
    init:
      | Hash
      | Map<string, any>
      | Iterable<[string, any]>
      | Record<string, any>
  );
  constructor(...args: (string | any)[]);
  constructor(...args: any[]) {
    super();

    if (!args.length) {
      return;
    } else if (args.length === 1) {
      const init = args[0];
      if (init instanceof Hash) {
        for (const [k, v, a] of init.iterall()) {
          this.setElement(k, v, a);
        }
      } else if (typeof (init as any)[Symbol.iterator] === 'function') {
        for (const [k, v] of init as Iterable<[string, any]>) {
          this.setElement(k, v, new HashAttributes());
        }
      } else {
        for (const [k, v] of Object.entries(init as Record<string, any>)) {
          this.setElement(k, v, new HashAttributes());
        }
      }
    } else {
      if (args.length % 2 !== 0) {
        throw new Error(
          'Hash requires an even number of arguments (key-value pairs).'
        );
      }
      for (let i = 0; i < args.length; i += 2) {
        this.setElement(args[i], args[i + 1], new HashAttributes());
      }
    }
  }

  private _path(path: string, auto = false): { hash: Hash; key: string } {
    const parts = String(path).split(SEPARATOR);
    let s: Hash = this;

    for (const p of parts.slice(0, -1)) {
      const element = Map.prototype.get.call(s, p) as HashElement | undefined;
      if (!element) {
        if (!auto) {
          throw new Error(`KeyError: ${path}`);
        }

        const created = new HashElement(new Hash(), new HashAttributes());
        s._set_element(p, created);
        s = created.data.value_ as Hash;
        continue;
      }

      const data = element.data.value_;
      if (!(data instanceof Hash)) {
        throw new Error(`KeyError: ${path}`);
      }
      s = data;
    }

    return { hash: s, key: parts[parts.length - 1] };
  }

  private _getElement(path: string, auto = false): HashElement {
    const p = String(path);
    if (!p.includes(SEPARATOR)) {
      const n = Map.prototype.get.call(this, p) as HashElement | undefined;

      if (!n) {
        throw new Error(`KeyError: ${p}`);
      }
      return n;
    }
    const { hash, key } = this._path(p, auto);
    const n = Map.prototype.get.call(hash, key) as HashElement | undefined;
    if (!n) {
      throw new Error(`KeyError: ${p}`);
    }
    return n;
  }

  private _set_element(key: string, element: HashElement): void {
    if (key.includes(SEPARATOR)) {
      throw new Error("Can't set values in sub-hashes with _set_element");
    }
    Map.prototype.set.call(this, key, element);
  }

  public getElement(path: string): { data: any; attrs: HashAttributes } {
    const element = this._getElement(path, false);
    return { data: element.data, attrs: element.attrs };
  }

  public setElement(
    path: string,
    value: any,
    attrs?: HashAttributes | Record<string, any>
  ): void {
    const key = String(path);
    const elementAttrs =
      attrs instanceof HashAttributes ? attrs : new HashAttributes(attrs);
    const element = new HashElement(wrapKaraboValue(value), elementAttrs);

    if (!key.includes(SEPARATOR)) {
      Map.prototype.set.call(this, key, element);
      return;
    }

    const { hash, key: leaf } = this._path(key, true);
    Map.prototype.set.call(hash, leaf, element);
  }

  override set(path: string, value: any): this {
    const key = String(path);

    if (!key.includes(SEPARATOR)) {
      const existing = Map.prototype.get.call(this, key) as
        | HashElement
        | undefined;
      const attrs = existing ? existing.attrs : new HashAttributes();
      Map.prototype.set.call(
        this,
        key,
        new HashElement(wrapKaraboValue(value), attrs)
      );
      return this;
    }

    const { hash, key: leaf } = this._path(key, true);
    const existing = Map.prototype.get.call(hash, leaf) as
      | HashElement
      | undefined;
    const attrs = existing ? existing.attrs : new HashAttributes();
    Map.prototype.set.call(
      hash,
      leaf,
      new HashElement(wrapKaraboValue(value), attrs)
    );

    return this;
  }

  override get(path: string): any {
    return this._getElement(path, false).data;
  }

  public getValue<T = any>(path: string): T {
    return this._getElement(path, false).data.value_ as T;
  }

  public getAttributes(path: string): HashAttributes {
    return this._getElement(path, false).attrs;
  }

  public getAttribute(path: string, attrKey: string): HashValues {
    const attrs = this._getElement(path, false).attrs;
    const v = attrs.get(attrKey);
    if (v === undefined) {
      throw new Error(`KeyError: attribute ${attrKey}`);
    }
    return v;
  }

  public getAttributeValue(path: string, attrKey: string): any {
    const v = this.getAttribute(path, attrKey);
    return v.value_;
  }

  public setAttribute(path: string, attrKey: string, attrValue: any): void {
    const element = this._getElement(path, false);
    element.attrs.set(attrKey, attrValue);
  }

  public setAttributes(
    path: string,
    attrs: HashAttributes | Record<string, any>
  ): void {
    const element = this._getElement(path, false);
    element.attrs = new HashAttributes(attrs);
  }

  public *items(): IterableIterator<[string, any]> {
    for (const [k, element] of this.entries()) {
      // prettier-ignore
      yield [k, element.data];
    }
  }

  public *iterall(): IterableIterator<[string, any, HashAttributes]> {
    for (const [k, element] of this.entries()) {
      // prettier-ignore
      yield [k, element.data, element.attrs];
    }
  }

  public *iterallValues(): IterableIterator<
    [string, any, { [key: string]: any }]
  > {
    for (const [k, element] of this.entries()) {
      const simple: Record<string, any> = {};
      for (const [ak, av] of element.attrs.entries()) {
        simple[ak] = (av as any).value_ ?? av;
      }
      // prettier-ignore
      yield [k, element.data.value_, simple];
    }
  }

  public merge(
    other: Hash,
    attributePolicy: 'merge' | 'replace' = 'merge'
  ): void {
    const mergeAttrs = attributePolicy === 'merge';

    for (const [k, v] of other.items()) {
      if (v instanceof Hash) {
        const existing = this.find(k);
        if (!(existing instanceof Hash)) {
          this.set(k, new Hash());
        }
        (this.get(k) as Hash).merge(v, attributePolicy);
      } else {
        this.set(k, v);
      }

      const otherAttrs = other.getAttributes(k);

      if (mergeAttrs) {
        // For merge, we can just iterate and set.
        // HashAttributes.set will handle wrapping if needed (though otherAttrs are already wrapped)
        const targetAttrs = this.getAttributes(k);
        for (const [ak, av] of otherAttrs) {
          targetAttrs.set(ak, av);
        }
      } else {
        this.setAttributes(k, otherAttrs);
      }
    }
  }

  override has(path: string): boolean {
    try {
      this._getElement(path, false);
      return true;
    } catch {
      return false;
    }
  }

  public find(path: string): any | undefined {
    try {
      return this.get(path);
    } catch {
      return undefined;
    }
  }

  public erase(path: string): void {
    const p = String(path);

    if (!p.includes(SEPARATOR)) {
      Map.prototype.delete.call(this, p);
      return;
    }

    const { hash, key } = this._path(p, false);
    Map.prototype.delete.call(hash, key);
  }

  public getKeys(into?: string[]): string[] | void {
    const keys = Array.from(this.keys());
    if (!into) return keys;
    into.push(...keys);
  }

  public empty(): boolean {
    return this.size === 0;
  }

  public paths(opts: { intermediate?: boolean } = {}): string[] {
    const { intermediate = false } = opts;

    const leafPaths = (h: Hash, prefix: string[] = []): string[] => {
      const out: string[] = [];
      for (const [k, v] of h.items()) {
        if (v instanceof Hash && v.size > 0)
          out.push(...leafPaths(v, [...prefix, k]));
        else out.push([...prefix, k].join(SEPARATOR));
      }
      return out;
    };

    const fullPaths = (h: Hash, base = ''): string[] => {
      const out: string[] = [];
      for (const [k, v] of h.items()) {
        const here = base ? `${base}.${k}` : k;
        if (v instanceof Hash) out.push(...fullPaths(v, here));
        out.push(here);
      }
      return out;
    };

    return intermediate ? fullPaths(this) : leafPaths(this);
  }
}

export function wrapKaraboValue(value: any): HashValues {
  if (isKaraboValue(value)) {
    return value;
  }
  const ktype = getHashTypeFromValue(value);
  return castKaraboValue(ktype, value);
}

export class Schema {
  readonly type_ = HashTypes.Schema;

  constructor(
    public name: string,
    public hash: Hash
  ) {}

  public get value_(): Schema {
    return this;
  }
}

export class HashList extends Array<Hash> {
  readonly type_ = HashTypes.VectorHash;

  constructor(values: number | Iterable<Hash> = []) {
    if (typeof values === 'number') super(values);
    else super(...values);
  }

  public get value_(): HashList {
    return this;
  }
}
