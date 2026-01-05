import { Hash, HashList, Schema } from '@/karabo-hash/hash';
import { HashTypes } from '@/karabo-hash/typenums';

// Helper to check if a value is a wrapped Karabo type (has type_)
const isWrapped = (v: any) => v && typeof v === 'object' && 'type_' in v;

describe('Karabo Hash Class Tests', () => {
  describe('1. Constructors', () => {
    test('default constructor', () => {
      const h = new Hash();
      expect(h.size).toBe(0);
      expect(h.empty()).toBe(true);
    });

    test('constructor with Record<string, any>', () => {
      const h = new Hash({ a: 1, b: 2.5, c: 'string' });
      expect(h.size).toBe(3);
      expect(h.getValue('a')).toBe(1);
      expect(h.getValue('b')).toBe(2.5);
      expect(h.getValue('c')).toBe('string');
    });

    test('constructor with Iterable', () => {
      const map = new Map<string, any>([
        ['x', 10],
        ['y', 20],
      ]);
      const h = new Hash(map);
      expect(h.size).toBe(2);
      expect(h.getValue('x')).toBe(10);
    });

    test('constructor with another Hash (Shallow Copy)', () => {
      const original = new Hash();
      original.set('nested.val', 100);
      original.setAttribute('nested.val', 'attr', 'test');

      const copy = new Hash(original);

      // Check data copy exists
      expect(copy.getValue('nested.val')).toBe(100);

      // Check Shared Reference (Shallow Copy Behavior)
      // Modifying the copy SHOULD affect the original because 'nested' is the same object
      copy.set('nested.val', 200);

      expect(copy.getValue('nested.val')).toBe(200);
      expect(original.getValue('nested.val')).toBe(200); // Original is updated due to shallow copy

      // Check attributes
      expect(copy.getAttribute('nested.val', 'attr').value_).toBe('test');
      expect(copy.getAttributeValue('nested.val', 'attr')).toBe('test');
    });
  });

  describe('2. Basic Access & Mutation (get/set/has)', () => {
    let h: Hash;
    beforeEach(() => (h = new Hash()));

    test('set and get (Wrapped vs Unwrapped)', () => {
      h.set('foo', 42);

      // get() returns the Wrapper (e.g. Int32, UInt32 depending on inferrence)
      const wrapped = h.get('foo');
      expect(isWrapped(wrapped)).toBe(true);
      expect(wrapped.value_).toBe(42);

      // getValue() returns the Native value
      expect(h.getValue('foo')).toBe(42);
    });

    test('has (Direct Key)', () => {
      h.set('foo', 1);
      expect(h.has('foo')).toBe(true);
      expect(h.has('bar')).toBe(false);
    });

    test('error handling on missing keys', () => {
      expect(() => h.get('missing')).toThrow(/KeyError/);
      expect(() => h.getValue('missing')).toThrow(/KeyError/);
    });
  });

  describe('3. Nested Access (Dot Notation)', () => {
    let h: Hash;
    beforeEach(() => (h = new Hash()));

    test('set nested path creates intermediate Hashes', () => {
      h.set('a.b.c', 99);

      expect(h.getValue('a')).toBeInstanceOf(Hash);
      expect((h.getValue('a') as Hash).getValue('b')).toBeInstanceOf(Hash);
      expect(h.getValue('a.b.c')).toBe(99);
    });

    test('get nested path', () => {
      h.set('x.y', 'hello');
      expect(h.getValue('x.y')).toBe('hello');
      // Wrapped version
      expect(h.get('x.y').value_).toBe('hello');
    });

    test('has with nested path', () => {
      h.set('m.n', true);
      expect(h.has('m.n')).toBe(true);
      expect(h.has('m.z')).toBe(false);
      expect(h.has('z.n')).toBe(false);
    });

    test('erase nested key', () => {
      h.set('tree.leaf', 1);
      expect(h.has('tree.leaf')).toBe(true);

      h.erase('tree.leaf');
      expect(h.has('tree.leaf')).toBe(false);
      expect(h.has('tree')).toBe(true); // Parent should still exist
      expect((h.getValue('tree') as Hash).size).toBe(0);
    });
  });

  describe('4. Element Access (Data + Attributes)', () => {
    test('setElement and getElement', () => {
      const h = new Hash();
      const attrs = new Map([['unit', 'meter']]);

      h.setElement('sensor.val', 15.5, attrs);

      const el = h.getElement('sensor.val');
      // Data should be wrapped
      expect(el.data.value_).toBe(15.5);
      // Attrs should be a Map of wrapped values
      expect(el.attrs.get('unit').value_).toBe('meter');
    });
  });

  describe('5. Attributes API', () => {
    let h: Hash;
    beforeEach(() => {
      h = new Hash();
      h.set('data', 100);
    });

    test('setAttribute and getAttribute', () => {
      h.setAttribute('data', 'precision', 2);

      // getAttribute returns Wrapped value
      const attr = h.getAttribute('data', 'precision');
      expect(attr.value_).toBe(2);
    });

    test('getAttributes (Bulk)', () => {
      h.setAttribute('data', 'a1', 1);
      h.setAttribute('data', 'a2', 2);

      const attrs = h.getAttributes('data');
      expect(attrs).toBeInstanceOf(Map);
      expect(attrs.size).toBe(2);
      expect(attrs.get('a1').value_).toBe(1);
    });

    test('setAttributes (Replace)', () => {
      h.setAttribute('data', 'old', 1);
      // Manually wrap for this test, or rely on internal wrapping if passing to setElement.
      // Since we are testing setAttributes directly, we expect it to take Attributes map.
      // But typically, we'd want to test the full behavior.
      // Here we assume setElement handles the wrapping for setup.
      h.setElement('data', 100, { new: 99 });

      const attrs = h.getAttributes('data');
      expect(attrs.has('old')).toBe(false); // Replaced
      expect(attrs.has('new')).toBe(true);
      expect(attrs.get('new').value_).toBe(99);
    });
  });

  describe('6. Iteration', () => {
    test('items() yields [key, wrapped_value]', () => {
      const h = new Hash({ a: 1, b: 2 });
      const items = Array.from(h.items());

      expect(items.length).toBe(2);

      const [key0, val0] = items[0];
      expect(key0).toBe('a');
      expect(isWrapped(val0)).toBe(true);
      expect(val0.value_).toBe(1);

      const [key1, val1] = items[1];
      expect(key1).toBe('b');
      expect(val1.value_).toBe(2);
    });

    test('iterall() yields [key, wrapped_value, attributes_map]', () => {
      const h = new Hash();
      h.setElement('a', 1, { unit: 'm' });

      const all = Array.from(h.iterall());

      // Expect: [key, wrapped_value, AttributesMap]
      expect(all.length).toBe(1);

      const [key, val, attrs] = all[0];

      expect(key).toBe('a');

      // Value is wrapped
      expect(isWrapped(val)).toBe(true);
      expect(val.value_).toBe(1);

      // Attrs is a Map<string, WrappedValue>
      expect(attrs).toBeInstanceOf(Map);
      expect(attrs.get('unit').value_).toBe('m');
    });

    test('getKeys', () => {
      const h = new Hash({ a: 1, b: 2 });

      // Return keys
      expect(h.getKeys()).toEqual(['a', 'b']);

      // Push into existing array
      const arr = ['start'];
      h.getKeys(arr);
      expect(arr).toEqual(['start', 'a', 'b']);
    });
  });

  describe('7. Merge', () => {
    test('merge simple keys', () => {
      const h1 = new Hash({ a: 1 });
      const h2 = new Hash({ b: 2 });
      h1.merge(h2);
      expect(h1.size).toBe(2);
      expect(h1.getValue('a')).toBe(1);
      expect(h1.getValue('b')).toBe(2);
    });

    test('merge nested hashes (Recursive)', () => {
      const h1 = new Hash();
      h1.set('config.min', 0);

      const h2 = new Hash();
      h2.set('config.max', 10); // Should merge into 'config'
      h2.set('other', 5);

      h1.merge(h2);
      expect(h1.size).toBe(2);

      expect(h1.getValue('config.min')).toBe(0);
      expect(h1.getValue('config.max')).toBe(10);
      expect(h1.getValue('other')).toBe(5);
    });

    test('merge attributes (Policy: merge)', () => {
      const h1 = new Hash();
      h1.setElement('prop', 1, { a: 1 });

      const h2 = new Hash();
      h2.setElement('prop', 2, { b: 2 }); // Value overwrites, attrs merge

      h1.merge(h2, 'merge');

      expect(h1.getValue('prop')).toBe(2); // Overwritten
      const attrs = h1.getAttributes('prop');
      expect(attrs.has('a')).toBe(true); // Kept
      expect(attrs.has('b')).toBe(true); // Added
    });

    test('merge attributes (Policy: replace)', () => {
      const h1 = new Hash();
      h1.setElement('prop', 1, { a: 1 });

      const h2 = new Hash();
      h2.setElement('prop', 2, { b: 2 });

      h1.merge(h2, 'replace');

      const attrs = h1.getAttributes('prop');
      expect(attrs.has('a')).toBe(false); // Removed
      expect(attrs.has('b')).toBe(true); // Added
    });
  });

  describe('8. Path Utilities', () => {
    let h: Hash;
    beforeEach(() => {
      h = new Hash();
      h.set('a.b.c', 1);
      h.set('a.x', 2);
      h.set('z', 3);
    });

    test('paths (Leaf Nodes)', () => {
      const p = h.paths(); // default intermediate=false
      // Should return full dot-paths to values
      expect(p).toContain('a.b.c');
      expect(p).toContain('a.x');
      expect(p).toContain('z');
      expect(p).not.toContain('a'); // intermediate
      expect(p).not.toContain('a.b'); // intermediate
    });

    test('paths (Intermediate)', () => {
      const p = h.paths({ intermediate: true });
      expect(p).toContain('a');
      expect(p).toContain('a.b');
      expect(p).toContain('a.b.c');
      expect(p).toContain('a.x');
      expect(p).toContain('z');
    });
  });

  describe('9. Misc Utilities', () => {
    test('getOrUndefined', () => {
      const h = new Hash({ a: 1 });
      expect(h.getOrUndefined('a')).toBeDefined();
      expect(h.getOrUndefined('missing')).toBeUndefined();
    });

    describe('10. Schema Class', () => {
      test('Constructor sets name and hash correctly', () => {
        const innerHash = new Hash({ key: 'value' });
        const schemaName = 'MyDeviceSchema';

        const schema = new Schema(schemaName, innerHash);

        expect(schema.name).toBe(schemaName);
        expect(schema.hash).toBe(innerHash);
        expect(schema.hash.getValue('key')).toBe('value');
      });

      test('Schema satisfies KaraboValue protocol', () => {
        const schema = new Schema('Test', new Hash());

        expect(schema.type_).toBe(HashTypes.Schema);
        // For Schema, value_ returns the instance itself
        expect(schema.value_).toBe(schema);
      });

      test('Storing Schema in a Hash', () => {
        const root = new Hash();
        const inner = new Hash({ a: 1 });
        const schema = new Schema('Embedded', inner);

        // Schema is a KaraboValue (has type_), so it shouldn't be double-wrapped
        root.set('meta', schema);

        // 1. Check direct get() - returns the Schema instance
        const retrieved = root.get('meta');
        expect(retrieved).toBeInstanceOf(Schema);
        expect(retrieved.type_).toBe(HashTypes.Schema);
        expect(retrieved.name).toBe('Embedded');

        // 2. Check getValue() - returns the Schema instance (value_ is self)
        const value = root.getValue('meta');
        expect(value).toBeInstanceOf(Schema);
        expect((value as Schema).hash.getValue('a')).toBe(1);
      });
    });

    describe('11. HashList (VectorHash) Class', () => {
      test('Constructor accepts array of Hashes', () => {
        const h1 = new Hash({ id: 1 });
        const h2 = new Hash({ id: 2 });

        const list = new HashList([h1, h2]);

        expect(list.value_.length).toBe(2);
        expect(list.value_[0].getValue('id')).toBe(1);
        expect(list.value_[1].getValue('id')).toBe(2);
      });

      test('HashList satisfies KaraboValue protocol', () => {
        const list = new HashList([]);

        expect(list.type_).toBe(HashTypes.VectorHash);
        // value_ should be the raw array
        expect(Array.isArray(list.value_)).toBe(true);
      });

      test('Storing HashList in a Hash', () => {
        const root = new Hash();
        const h1 = new Hash({ val: 100 });
        const listObj = new HashList([h1]);

        root.set('configurations', listObj);

        // 1. Check direct get() - returns the HashList instance
        const retrievedRaw = root.get('configurations');
        expect(retrievedRaw).toBeInstanceOf(HashList);
        expect(retrievedRaw.type_).toBe(HashTypes.VectorHash);

        // 2. Check getValue() - returns the Array<Hash>
        const retrievedVal = root.getValue('configurations');
        expect(Array.isArray(retrievedVal)).toBe(true);
        expect(retrievedVal.length).toBe(1);
        expect((retrievedVal[0] as Hash).getValue('val')).toBe(100);
      });

      test('Mutating the array inside HashList', () => {
        const root = new Hash();
        const listObj = new HashList([]); // Empty start
        root.set('list', listObj);

        // Access the array and push a new Hash
        const arr = root.getValue('list') as Hash[];
        arr.push(new Hash({ modified: true }));

        // Check if reference is maintained
        const checkAgain = root.getValue('list') as Hash[];
        expect(checkAgain.length).toBe(1);
        expect(checkAgain[0].getValue('modified')).toBe(true);
      });
    });

    describe('12. Mixed Nested Structures', () => {
      test('Hash -> Schema -> Hash -> HashList', () => {
        // Create the leaf HashList
        const leafHash = new Hash({ leaf: true });
        const list = new HashList([leafHash]);

        // Create the middle Hash holding the list
        const middle = new Hash();
        middle.set('myList', list);

        // Create the Schema holding the middle Hash
        const schema = new Schema('ComplexSchema', middle);

        // Create the Root Hash holding the Schema
        const root = new Hash();
        root.set('schemaDef', schema);

        // Accessing deeply
        const retrievedSchema = root.getValue('schemaDef') as Schema;
        const retrievedMiddle = retrievedSchema.hash;
        const retrievedList = retrievedMiddle.getValue('myList') as Hash[];

        expect(retrievedList[0].getValue('leaf')).toBe(true);
      });
    });
  });
});
