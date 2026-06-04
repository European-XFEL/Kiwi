import { Hash, HashList } from '@/karabo/data/hash';

export function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': {
        return '&lt;';
      }
      case '>': {
        return '&gt;';
      }
      case '&': {
        return '&amp;';
      }
      case "'": {
        return '&apos;';
      }
      case '"': {
        return '&quot;';
      }
      default: {
        return c;
      }
    }
  });
}

export function quoteAttr(value: string): string {
  return `"${escapeXml(value)}"`;
}

// Base64 handling
// ------------------------------------------------------------------

export function toBase64(data: Uint8Array): string {
  let binary = '';
  const len = data.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

export const fromBase64 = (data: string): Uint8Array => {
  const binary = atob(data);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }

  return out;
};

// ------------------------------------------------------------------

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') return false;

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

/**
 * Helper to extract the raw primitive value from a KaraboValue.
 * If data is not a wrapper (e.g. raw string), returns data as is.
 */
export function unwrap(data: any): any {
  if (data && typeof data === 'object' && 'value_' in data) {
    return data.value_;
  }
  return data;
}

/**
 * Helper to yield a Hash with full leaf keys
 */
export function* flatIterall(
  hash: Hash,
  base: string = '',
  empty: boolean = false
): IterableIterator<[string, any, any]> {
  const prefix = base ? `${base}.` : '';

  for (const [k, v, a] of hash.iterall()) {
    const subkey = prefix + k;

    if (v instanceof Hash) {
      if (empty) {
        yield [subkey, v, a];
      } else {
        // recurse into the nested hash, using the full path as the new base
        yield* flatIterall(v, subkey, empty);
      }
    } else {
      yield [subkey, v, a];
    }
  }
}

/**
 * Helper to create a Hash from a Record
 */
export function dictToHash(d: Record<string, unknown>): Hash {
  const h = new Hash();

  for (const [k, v] of Object.entries(d)) {
    if (isPlainObject(v)) {
      h.set(k, dictToHash(v));
      continue;
    }

    if (Array.isArray(v)) {
      if (v.length > 0 && isPlainObject(v[0])) {
        h.set(k, new HashList(v.map((vv) => dictToHash(vv))));
      } else {
        h.set(k, v);
      }
      continue;
    }

    h.set(k, v);
  }

  return h;
}

/**
 * Helper to create a Record from a Hash, we lose all typing information
 */
export function hashToDict(h: Hash): Record<string, unknown> {
  const d: Record<string, unknown> = {};

  for (const [k, rawValue] of h.items()) {
    const v = unwrap(rawValue);

    if (v instanceof Hash) {
      d[k] = hashToDict(v);
      continue;
    }

    if (Array.isArray(v)) {
      if (v.length > 0 && unwrap(v[0]) instanceof Hash) {
        d[k] = v.map((vv) => hashToDict(unwrap(vv) as Hash));
      } else {
        d[k] = v.map((vv) => unwrap(vv));
      }
      continue;
    }

    d[k] = v;
  }

  return d;
}
