import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { Hash, HashList, Schema } from '../hash';
import { encodeXML, saveToFile } from '../xml_writer';
import { decodeXML, loadFromFile } from '../xml_reader';

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

function create_hash(): Hash {
  const h = new Hash();
  h.set('int_val', 123);
  h.set('float_val', 12.34);
  h.set('string_val', 'hello');

  const nested = new Hash();
  nested.set('inner', 'value');
  h.set('nested', nested);

  return h;
}

function check_hash(h: Hash): void {
  if (!h.has('int_val') || !h.has('string_val')) {
    throw new Error('Hash integrity check failed');
  }
}

// ============================================================================

describe('TestSerializers', () => {
  let tempDir: string;
  let oldCwd: string;
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
    oldCwd = process.cwd();
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

  test('xml_BoundSchema_load', () => {
    /*
     * Tests that a xml for a Bound Schema with vector of hash and
     * schema attributes can be successfully loaded.
     */
    const sch_hash = decodeXML(BOUND_TABLE_SCHEMA_XML);
    expect(sch_hash.has('table')).toBeTruthy();

    // Access nested properties via getAttribute logic
    // Assuming Hash implementation has getAttribute(key, attrName)
    const rowSchema = sch_hash.getAttribute('table', 'rowSchema');
    const defaultValue = sch_hash.getAttribute('table', 'defaultValue');

    expect(rowSchema instanceof Schema).toBeTruthy();
    expect(defaultValue instanceof HashList).toBeTruthy();
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

  test('xml_serialization', () => {
    const h = create_hash();
    check_hash(h);

    const encoded = encodeXML(h);
    // Note: Adler32 check removed as it requires external binary dependency

    const decoded = decodeXML(encoded);
    check_hash(decoded);

    expect(decoded).toEqual(h);
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
