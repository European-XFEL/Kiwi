import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { Hash, HashList, Schema } from '../hash';
import { encodeXML, saveToFile } from '../xml_writer';
import { decodeXML, loadFromFile } from '../xml_reader';
import {
  BoolValue,
  FloatValue,
  DoubleValue,
  Int32Value,
  Int64Value,
  Int8Value,
  StringValue,
  UInt32Value,
  UInt64Value,
  VectorBoolValue,
  VectorCharValue,
  VectorFloatValue,
  VectorDoubleValue,
  VectorInt32Value,
  VectorStringValue,
} from '../types';

const BOUND_HASH_XML = `<?xml version="1.0"?>
<root KRB_Artificial="" KRB_Type="HASH">
  <akey KRB_Type="STRING">aval</akey>
  <another KRB_Type="HASH">
    <nested KRB_Type="DOUBLE">1.618000000000000</nested>
  </another>
</root>
`;

// The following XML is what the middlelayer API generates (JS implementation should match)
const MDL_HASH_XML =
  '<root KRB_Artificial=""><akey KRB_Type="STRING" >aval</akey><another KRB_Type="HASH" ><nested KRB_Type="DOUBLE" >1.618</nested></another></root>';

const BOUND_VECTOR_HASH_XML = `<?xml version="1.0"?>
<root KRB_Artificial="" KRB_Type="HASH">
    <KRB_Sequence KRB_Type="VECTOR_HASH">
       <KRB_Item>
           <e1 KRB_Type="STRING">ab.KRB_NEWLINE.c3</e1>
           <e2 alarmCondition="KRB_STRING:none" KRB_Type="BOOL">0</e2>
           <e3 alarmCondition="KRB_STRING:none" KRB_Type="INT32">36</e3>
           <e4 alarmCondition="KRB_STRING:none" KRB_Type="FLOAT">2.9511</e4>
           <e5 alarmCondition="KRB_STRING:none" KRB_Type="DOUBLE">3.7035</e5>
        </KRB_Item>
    </KRB_Sequence>
</root>
`;

const BOUND_TABLE_SCHEMA_XML = `<?xml version="1.0"?>
    <root KRB_Artificial="" KRB_Type="HASH">
    <table displayedName="KRB_STRING:Table property"
      description="KRB_STRING:Table containing one node."
      assignment="KRB_INT32:0"
      defaultValue="KRB_VECTOR_HASH:_attr_root_table_defaultValue"
      accessMode="KRB_INT32:4" nodeType="KRB_INT32:0"
      leafType="KRB_INT32:0" displayType="KRB_STRING:Table"
      valueType="KRB_STRING:VECTOR_HASH"
      rowSchema="KRB_SCHEMA:_attr_root_table_rowSchema"
      requiredAccessLevel="KRB_INT32:1"
      overwriteRestrictions=
        "KRB_VECTOR_BOOL:0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0"
      KRB_Type="INT32">
        <_attr_root_table_defaultValue>
            <_attr_root_table_defaultValue_value KRB_Type="VECTOR_HASH">
                <KRB_Item>
                    <e1 KRB_Type="STRING">abc</e1>
                    <e2 alarmCondition="KRB_STRING:none" KRB_Type="BOOL">1</e2>
                    <e3 alarmCondition="KRB_STRING:none" KRB_Type="INT32">
                        12
                    </e3>
                    <e4 alarmCondition="KRB_STRING:none" KRB_Type="FLOAT">
                        0.9837
                    </e4>
                    <e5 alarmCondition="KRB_STRING:none" KRB_Type="DOUBLE">
                        1.2345
                    </e5>
                </KRB_Item>
                <KRB_Item>
                    <e1 KRB_Type="STRING">xyz</e1>
                    <e2 alarmCondition="KRB_STRING:none" KRB_Type="BOOL">0</e2>
                    <e3 alarmCondition="KRB_STRING:none" KRB_Type="INT32">
                        42
                    </e3>
                    <e4 alarmCondition="KRB_STRING:none" KRB_Type="FLOAT">
                        2.33333
                    </e4>
                    <e5 alarmCondition="KRB_STRING:none" KRB_Type="DOUBLE">
                        7.77777
                    </e5>
                </KRB_Item>
            </_attr_root_table_defaultValue_value>
        </_attr_root_table_defaultValue>
        <_attr_root_table_rowSchema>
            <_attr_root_table_rowSchema_value KRB_Type="SCHEMA">
              :&lt;?xml version="1.0"?&gt;&lt;root KRB_Artificial="" KRB_Type="HASH"&gt;&lt;e1 daqPolicy="KRB_INT32:-1" displayedName="KRB_STRING:E1" description="KRB_STRING:E1 property" assignment="KRB_INT32:0" defaultValue="KRB_STRING:E1" accessMode="KRB_INT32:4" nodeType="KRB_INT32:0" leafType="KRB_INT32:0" valueType="KRB_STRING:STRING" requiredAccessLevel="KRB_INT32:1" KRB_Type="INT32"&gt;0&lt;/e1&gt;&lt;e2 daqPolicy="KRB_INT32:-1" displayedName="KRB_STRING:E2" description="KRB_STRING:E2 property" accessMode="KRB_INT32:4" assignment="KRB_INT32:0" defaultValue="KRB_BOOL:0" nodeType="KRB_INT32:0" leafType="KRB_INT32:0" valueType="KRB_STRING:BOOL" requiredAccessLevel="KRB_INT32:1" KRB_Type="INT32"&gt;0&lt;/e2&gt;&lt;e3 daqPolicy="KRB_INT32:-1" displayedName="KRB_STRING:E3" description="KRB_STRING:E3 property" accessMode="KRB_INT32:4" assignment="KRB_INT32:0" defaultValue="KRB_INT32:77" nodeType="KRB_INT32:0" leafType="KRB_INT32:0" valueType="KRB_STRING:INT32" requiredAccessLevel="KRB_INT32:1" KRB_Type="INT32"&gt;0&lt;/e3&gt;&lt;e4 daqPolicy="KRB_INT32:-1" displayedName="KRB_STRING:E4" description="KRB_STRING:E4 property" assignment="KRB_INT32:0" defaultValue="KRB_FLOAT:3.1415" accessMode="KRB_INT32:4" nodeType="KRB_INT32:0" leafType="KRB_INT32:0" valueType="KRB_STRING:FLOAT" requiredAccessLevel="KRB_INT32:1" KRB_Type="INT32"&gt;0&lt;/e4&gt;&lt;e5 daqPolicy="KRB_INT32:-1" displayedName="KRB_STRING:E5" description="KRB_STRING:E5 property" assignment="KRB_INT32:0" defaultValue="KRB_DOUBLE:2.78" accessMode="KRB_INT32:4" nodeType="KRB_INT32:0" leafType="KRB_INT32:0" valueType="KRB_STRING:DOUBLE" requiredAccessLevel="KRB_INT32:1" KRB_Type="INT32"&gt;0&lt;/e5&gt;&lt;/root&gt;</_attr_root_table_rowSchema_value>
        </_attr_root_table_rowSchema>0
    </table>
    </root>
`;

const BOUND_TABLE_SCHEMA_LEGACY_XML = `<?xml version="1.0"?>
    <root KRB_Artificial="" KRB_Type="HASH">
        <table displayedName="KRB_STRING:Table property"
          description="KRB_STRING:Table containing one node."
          assignment="KRB_INT32:0"
          nodeType="KRB_INT32:0"
          leafType="KRB_INT32:0"
          displayType="KRB_STRING:Table"
          valueType="KRB_STRING:VECTOR_HASH"
          requiredAccessLevel="KRB_INT32:1"
          accessMode="KRB_INT32:4"
          rowSchema="KRB_SCHEMA:Schema Object"
          defaultValue="KRB_VECTOR_HASH:'e1' =&gt; abc STRING&#10;'e2' alarmCondition=&quot;none&quot; =&gt; 1 BOOL&#10;'e3' alarmCondition=&quot;none&quot; =&gt; 12 INT32&#10;'e4' alarmCondition=&quot;none&quot; =&gt; 0.9837 FLOAT&#10;'e5' alarmCondition=&quot;none&quot; =&gt; 1.2345 DOUBLE&#10;,'e1' =&gt; xyz STRING&#10;'e2' alarmCondition=&quot;none&quot; =&gt; 0 BOOL&#10;'e3' alarmCondition=&quot;none&quot; =&gt; 42 INT32&#10;'e4' alarmCondition=&quot;none&quot; =&gt; 2.33333 FLOAT&#10;'e5' alarmCondition=&quot;none&quot; =&gt; 7.77777 DOUBLE&#10;"
          KRB_Type="INT32">0
        </table>
    </root>
`;

/**
 * Creates a Hash with a comprehensive mix of types.
 * Combines implicit value wrapping (basic usage) and explicit KaraboValue creation (complex usage).
 */
function create_hash(): Hash {
  const h = new Hash();

  // --- Implicit Wrapping Tests ---
  // These should be automatically wrapped into their default Karabo Types
  h.set('int_val', 123);
  h.set('float_val', 12.34);
  h.set('string_val', 'hello');

  // --- Explicit Primitive Types ---
  h.set('bool_t', new BoolValue(true));
  h.set('bool_f', new BoolValue(false));
  h.set('string_complex', new StringValue('Karabo <> XML'));

  // --- Integers ---
  h.set('int8', new Int8Value(-120));
  h.set('uint32', new UInt32Value(4000000));
  h.set('int32', new Int32Value(-99999));
  // Note: BigInt requires 'n' suffix or BigInt constructor
  h.set('int64', new Int64Value(9007199254740991n));
  h.set('uint64', new UInt64Value(18446744073709551610n));

  // --- Floats ---
  // Float32 might lose precision in roundtrip if not careful,
  // but the XML reader reads it back as a JS number.
  h.set('float32', new FloatValue(1.25));
  h.set('float64', new DoubleValue(Math.PI));

  // --- Vectors ---
  h.set('v_string', new VectorStringValue(['one', 'two', 'three']));
  h.set('v_bool', new VectorBoolValue([true, false, true]));
  h.set('v_int32', new VectorInt32Value([1, 2, 3, 4]));
  h.set('v_float32', new VectorFloatValue([1.1, 2.2, 3.3]));
  h.set('v_float64', new VectorDoubleValue([1.1, 2.2, 3.3]));

  // --- Byte Array (Vector Char) ---
  const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
  h.set('byte_array', new VectorCharValue(bytes));

  // --- Nested Structures ---
  const nested = new Hash();
  nested.set('inner', 'value'); // Implicit
  nested.set('inner_val', new Int32Value(42)); // Explicit
  h.set('nested', nested);

  // --- Vector Hash (Table) ---
  const row1 = new Hash();
  row1.set('id', new Int32Value(1));
  const row2 = new Hash();
  row2.set('id', new Int32Value(2));
  h.set('table', new HashList([row1, row2]));

  return h;
}

// ============================================================================

describe('TestSerializers', () => {
  let tempDir: string;
  let FILENAME: string;

  // Replicating global HASH from python
  const HASH = new Hash();
  HASH.set('akey', 'aval');
  const inner = new Hash();
  inner.set('nested', 1.618);
  HASH.set('another', inner);

  beforeEach(() => {
    // Create temp dir
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'karabo_test_'));
    // In Node it is unsafe to change process.cwd() inside tests running in parallel.
    // We will resolve paths against tempDir instead.
    FILENAME = path.join(tempDir, 'all', 'the', 'folders', 'hash.xml');
  });

  afterEach(() => {
    // Cleanup
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.error('Failed to cleanup temp dir', e);
    }
  });

  test('saveToFile', () => {
    const simplePath = path.join(tempDir, 'hash.xml');

    // Test saving in the current directory (simulated via tempDir join)
    saveToFile(HASH, simplePath);
    expect(fs.existsSync(simplePath)).toBeTruthy();

    // Test without any sub-directories existing
    saveToFile(HASH, FILENAME);
    expect(fs.existsSync(FILENAME)).toBeTruthy();

    const readString = fs.readFileSync(FILENAME, 'utf-8');
    expect(readString).toEqual(MDL_HASH_XML);

    const readHash = decodeXML(readString);
    expect(readHash).toEqual(HASH);

    // Test with sub-directories already existing
    fs.unlinkSync(FILENAME);
    expect(fs.existsSync(FILENAME)).toBeFalsy();

    saveToFile(HASH, FILENAME);
    expect(fs.existsSync(FILENAME)).toBeTruthy();

    // Test with xml file already existing
    expect(fs.existsSync(FILENAME)).toBeTruthy();
    saveToFile(HASH, FILENAME);

    // Test with non-Hash value
    expect(() => {
      saveToFile(null, FILENAME);
    }).toThrow();
  });

  test('loadFromFile', () => {
    // Test valid xml
    const filePath = path.join(tempDir, 'hash.xml');
    fs.writeFileSync(filePath, encodeXML(HASH), 'utf-8');

    const h = loadFromFile(filePath);
    expect(h).toEqual(HASH);

    // Test malformatted xml
    const badPath = path.join(tempDir, 'bad.xml');
    fs.writeFileSync(badPath, MDL_HASH_XML.slice(0, -5), 'utf-8');

    expect(() => {
      loadFromFile(badPath);
    }).toThrow();
  });

  test('load_bound_hash_xml', () => {
    const filePath = path.join(tempDir, 'bash.xml');
    fs.writeFileSync(filePath, BOUND_HASH_XML, 'utf-8');

    const h = loadFromFile(filePath);
    expect(h).toEqual(HASH);
  });

  test('load_bound_vector_hash', () => {
    /*
     * Tests loading BOUND_VECTOR_HASH_XML which contains a Vector Hash (sequence).
     * This xml structure usually represents a Table with rows (items).
     */
    const h = decodeXML(BOUND_VECTOR_HASH_XML);
    expect(h.has('KRB_Sequence')).toBeTruthy();

    const sequence = h.get('KRB_Sequence');
    expect(sequence instanceof HashList).toBeTruthy();

    const items = sequence.value_;
    expect(items.length).toBe(1);

    const item = items[0]; // The first Hash in the list
    expect(item instanceof Hash).toBeTruthy();

    // Assert values inside the item
    // e1: ab.KRB_NEWLINE.c3 -> Should be read as string
    expect(item.getValue('e1')).toBe('ab.KRB_NEWLINE.c3');
    // e2: BOOL 0
    expect(item.getValue('e2')).toBe(false);
    // e3: INT32 36
    expect(item.getValue('e3')).toBe(36);
    // e4: FLOAT 2.9511
    expect(item.getValue('e4')).toBeCloseTo(2.9511, 4);
  });

  test('xml_BoundSchema_load', () => {
    /*
     * Tests that a xml for a Bound Schema with vector of hash and
     * schema attributes can be successfully loaded.
     */
    const sch_hash = decodeXML(BOUND_TABLE_SCHEMA_XML);
    expect(sch_hash.has('table')).toBeTruthy();

    // 1. Verify Structure (Nested objects)
    const rowSchema = sch_hash.getAttribute('table', 'rowSchema');
    const defaultValue = sch_hash.getAttribute('table', 'defaultValue');
    expect(rowSchema instanceof Schema).toBeTruthy();

    expect(defaultValue instanceof HashList).toBeTruthy();
    const rows = defaultValue.value_;
    expect(rows.length).toBe(2);

    // 2. Verify String Attributes (especially UPPERCASE ones)
    // These values come from the 'KRB_STRING:...' attributes in the XML
    expect(sch_hash.getAttributeValue('table', 'valueType')).toBe(
      'VECTOR_HASH'
    );
    expect(sch_hash.getAttributeValue('table', 'displayType')).toBe('Table');
    expect(sch_hash.getAttributeValue('table', 'displayedName')).toBe(
      'Table property'
    );
    expect(sch_hash.getAttributeValue('table', 'description')).toBe(
      'Table containing one node.'
    );

    // 3. Verify Primitive Attributes
    expect(sch_hash.getAttributeValue('table', 'accessMode')).toBe(4);
    expect(sch_hash.getAttributeValue('table', 'nodeType')).toBe(0);

    // 4. Verify Content inside Schema
    expect(rowSchema.hash.has('e1')).toBeTruthy();
    expect(rowSchema.hash.getValue('e4')).toBe(0); // value inside the tag
    expect(rowSchema.hash.getAttributeValue('e4', 'defaultValue')).toBe(3.1415);
  });

  test('legacy_xml_BoundSchema_load', () => {
    const sch_hash = decodeXML(BOUND_TABLE_SCHEMA_LEGACY_XML);
    expect(sch_hash.has('table')).toBeTruthy();

    const rowSchema = sch_hash.getAttribute('table', 'rowSchema');
    const defaultValue = sch_hash.getAttribute('table', 'defaultValue');

    expect(typeof rowSchema.value_).toBe('string');
    expect(rowSchema.value_).toBe('Schema Object');

    expect(typeof defaultValue.value_).toBe('string');
    expect((defaultValue.value_ as string).startsWith("'e1'")).toBeTruthy();
  });

  test('xml_serialization_roundtrip', () => {
    // 1. Create a complex hash with all types
    const original = create_hash();

    // 2. Encode and Decode
    const xml = encodeXML(original);
    const decoded = decodeXML(xml);

    // 3. Assert specific values to ensure precision/types are correct

    // Implicit types
    expect(decoded.getValue('int_val')).toBe(123);
    expect(decoded.getValue('float_val')).toBe(12.34);
    expect(decoded.getValue('string_val')).toBe('hello');

    // Booleans
    expect(decoded.getValue('bool_t')).toBe(true);
    expect(decoded.getValue('bool_f')).toBe(false);

    // String
    expect(decoded.getValue('string_complex')).toBe('Karabo <> XML');

    // Integers
    expect(decoded.getValue('int8')).toBe(-120);
    expect(decoded.getValue('uint32')).toBe(4000000);
    expect(decoded.getValue('int64')).toBe(9007199254740991n); // BigInt
    expect(decoded.getValue('uint64')).toBe(18446744073709551610n); // BigInt

    // Floats
    expect(decoded.getValue('float32')).toBeCloseTo(1.25);
    expect(decoded.getValue('float64')).toBeCloseTo(Math.PI, 8);

    // Vectors
    expect(decoded.getValue('v_string')).toEqual(['one', 'two', 'three']);
    expect(decoded.getValue('v_bool')).toEqual([true, false, true]);
    expect(decoded.getValue('v_int32')).toEqual([1, 2, 3, 4]);
    expect(decoded.getValue('v_float32')).toEqual([1.1, 2.2, 3.3]);
    expect(decoded.getValue('v_float64')).toEqual([1.1, 2.2, 3.3]);

    // Byte Array (Base64 roundtrip check)
    const originalBytes = original.getValue('byte_array');
    const decodedBytes = decoded.getValue('byte_array');
    expect(decodedBytes).toEqual(originalBytes); // Uint8Array comparison

    // Nested
    const nested = decoded.get('nested');
    expect(nested.getValue('inner')).toBe('value');
    expect(nested.getValue('inner_val')).toBe(42);

    // Vector Hash (Table)
    const table = decoded.getValue('table'); // Array of Hashes
    expect(table.length).toBe(2);
    expect(table[0].getValue('id')).toBe(1);
    expect(table[1].getValue('id')).toBe(2);

    // 4. Full Equality Check
    expect(decoded).toEqual(original);
  });

  test('uppercase_parsing_robustness', () => {
    const UPPERCASE_XML = `
    <root KRB_Artificial="" KRB_Type="HASH">
        <upper_bool KRB_Type="BOOL">TRUE</upper_bool>
        <mixed_bool KRB_Type="BOOL">True</mixed_bool>
        <upper_str KRB_Type="STRING">HELLO WORLD</upper_str>
        <mixed_str KRB_Type="STRING">HeLLo</mixed_str>
    </root>
    `;

    const decoded = decodeXML(UPPERCASE_XML);

    // Bool parser should handle TRUE/True as true
    expect(decoded.getValue('upper_bool')).toBe(true);
    expect(decoded.getValue('mixed_bool')).toBe(true);

    // Strings should preserve case
    expect(decoded.getValue('upper_str')).toBe('HELLO WORLD');
    expect(decoded.getValue('mixed_str')).toBe('HeLLo');
  });

  test('write_xml', () => {
    const fileName = 'test_hash_xml.xml';
    const filePath = path.join(tempDir, fileName);
    const h = create_hash();

    const fd = fs.openSync(filePath, 'w');
    // Simulating writing to file descriptor by writing to path directly
    fs.writeFileSync(filePath, encodeXML(h));
    fs.closeSync(fd);

    const content = fs.readFileSync(filePath, 'utf-8');
    const decoded = decodeXML(content);
    expect(decoded).toEqual(h);
  });
});
