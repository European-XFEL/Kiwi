import { Hash } from '@/karabo/data/hash';

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

export function toBase64(data: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(data).toString('base64');
  } else {
    // Browser fallback
    let binary = '';
    const len = data.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(data[i]);
    }
    return btoa(binary);
  }
}

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
