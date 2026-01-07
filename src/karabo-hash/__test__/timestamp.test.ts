import { Timestamp } from '../timestamp';
import { Hash } from '../hash';

describe('Timestamp Tests', () => {
  const RESOLUTION = 10n ** 18n;

  test('test_init', () => {
    const t = new Timestamp();
    const jsTime = Date.now() / 1000;
    expect(Math.abs(t.toTimestamp() - jsTime)).toBeLessThan(0.01);

    const t2 = new Timestamp('2009-04-20T10:32:22 UTC');
    expect(t2.toTimestamp()).toBe(1240223542);

    const t3 = new Timestamp(t2.toLocal());
    expect(t3.toTimestamp()).toBeCloseTo(1240223542);

    // Roundtrip structure check
    expect(t3.toLocal()).toBe(t3.toString());

    // Repr/UTC check
    expect(t3.toUTCString()).toContain('2009-04-20T10:32:22');
    expect(t3.toUTCString()).toContain('UTC');

    const tFromRepr = new Timestamp(t3.toUTCString());
    expect(tFromRepr.equals(t3)).toBe(true);

    const t4 = new Timestamp(t2);
    expect(t4.equals(t2)).toBe(true);

    const fval = 1553078935.396;
    const ival = BigInt(Math.floor(fval * Number(RESOLUTION)));
    const t5 = new Timestamp(fval);
    expect(t5.toTimestamp()).toBeCloseTo(fval, 3);
    const t6 = new Timestamp(ival);
    expect(t6.toTimestamp()).toBeCloseTo(fval, 3);
  });

  test('test_toLocal', () => {
    const local_str = '2022-05-01T11:22:33.123';
    const t = new Timestamp(local_str);
    expect(t.toLocal()).toContain('2022-05-01T11:22:33.123');
    expect(t.toLocal(' ')).toContain('2022-05-01 11:22:33.123');
  });

  test('test_hash_read', () => {
    expect(Timestamp.fromHashAttributes(new Map())).toBeNull();

    const attrs = new Map<string, bigint>();
    attrs.set('sec', 1234n);
    attrs.set('frac', 5678n);
    attrs.set('tid', 22n);

    const t = Timestamp.fromHashAttributes(attrs);
    expect(t).not.toBeNull();
    const expectedTime = 1234n * RESOLUTION + 5678n;
    expect(t!.time).toBe(expectedTime);
    expect(t!.tid).toBe(22n);
  });

  test('test_hash_write', () => {
    const t = new Timestamp('2009-09-01T14:23:00 UTC');
    const d = t.toMap();
    expect(d.get('sec')).toBe(1251814980n);
    expect(d.get('frac')).toBe(0n);
    expect(d.get('tid')).toBe(0n);
  });

  test('test_to_hash_attributes', () => {
    const t = new Timestamp('2009-09-01T14:23:00 UTC');
    const h = new Hash({ akey: 'aval', anotherkey: 5 });

    t.toHashAttributes(h);

    const attr1 = h.getAttributes('akey');
    // Note: getValue unwraps the KaraboValue
    expect(attr1.getValue('sec')).toBe(1251814980n);
    expect(attr1.getValue('frac')).toBe(0n);
    expect(attr1.getValue('tid')).toBe(0n);

    const attr2 = h.getAttributes('anotherkey');
    expect(attr2.getValue('sec')).toBe(1251814980n);
  });

  test('test_compare', () => {
    const t1 = new Timestamp();
    while (Date.now() <= t1.toTimestamp() * 1000) {}
    const t2 = new Timestamp();
    const t3 = new Timestamp(t2);

    expect(t1.lessThan(t2)).toBe(true);
    expect(t2.equals(t3)).toBe(true);
    expect(t2.lessThan(t1)).toBe(false);
  });

  test('test_add_sub', () => {
    const t1 = new Timestamp('2009-04-20T10:32:22 UTC');
    const t2 = new Timestamp('2009-04-20T10:32:23 UTC');
    expect(t2.subtract(t1)).toBeCloseTo(1.0);
    expect(t2.subtract(1)).toBeCloseTo(t1.toTimestamp());
    expect(t2.add(t1)).toBeCloseTo(t1.toTimestamp() + t2.toTimestamp());
  });

  test('test_hash_roundtrip', () => {
    const t1 = new Timestamp('2023-01-01T12:00:00 UTC');
    t1.tid = 999n;

    // Create a Hash with a dummy node
    const h = new Hash({ node: 1 });

    // Write Timestamp to the attributes of "node" in the Hash
    // This stores wrapped UInt64Values
    t1.toHashAttributes(h);

    // Retrieve attributes (HashAttributes object)
    const attrs = h.getAttributes('node');

    // Reconstruct Timestamp from HashAttributes
    // This requires fromHashAttributes to unwrap the values
    const t2 = Timestamp.fromHashAttributes(attrs);

    expect(t2).not.toBeNull();
    expect(t2!.equals(t1)).toBe(true);
    expect(t2!.tid).toBe(999n);
  });
});
