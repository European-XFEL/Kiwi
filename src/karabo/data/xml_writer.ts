import { Hash, HashList, Schema } from './hash';
import { HashType, HashTypeToXmlType } from './typenums';
import { escapeXml, quoteAttr, toBase64, unwrap } from './utils';
import * as fs from 'fs';
import * as path from 'path';

function* yield_xml_simple(data: any): Generator<string> {
  yield escapeXml(String(unwrap(data)));
}

function* yield_xml_bool(data: any): Generator<string> {
  const val = unwrap(data);
  yield escapeXml(val ? '1' : '0');
}

function* yield_xml_vector_simple(data: any): Generator<string> {
  const val = unwrap(data); // Expecting array
  if (Array.isArray(val)) {
    yield escapeXml(val.join(','));
  }
}

function* yield_xml_vector_bool(data: any): Generator<string> {
  const val = unwrap(data); // Expecting boolean[]
  if (Array.isArray(val)) {
    yield escapeXml(val.map((b) => (b ? '1' : '0')).join(','));
  }
}

function* yield_xml_byte_array(data: any): Generator<string> {
  const val = unwrap(data);
  yield escapeXml(toBase64(val));
}

function* yield_xml_vector_char(data: any): Generator<string> {
  yield* yield_xml_byte_array(data);
}

function* yield_xml_vector_hash(data: any): Generator<string> {
  const list = (data as HashList).value_ || [];
  for (const d of list) {
    yield '<KRB_Item>';
    yield* yield_xml_hash(d);
    yield '</KRB_Item>';
  }
}

function* yield_xml_schema(data: any): Generator<string> {
  yield (data as Schema).name;
  yield ':';
  // We need to render the internal Hash of the schema to a string
  const innerHashGen = yield_xml_hash((data as Schema).hash);
  let innerXml = '';
  for (const chunk of innerHashGen) {
    innerXml += chunk;
  }
  yield escapeXml(innerXml);
}

// ============================================================================

function* yield_xml_hash(data: Hash): Generator<string> {
  for (const [key, value, attrs] of data.iterall()) {
    const valueType = value.type_ as HashType;
    const valueTypeName = HashTypeToXmlType[valueType];
    const valueWriter = WRITER_MAP[valueType];

    // Open Tag
    yield `<${key} KRB_Type="${valueTypeName}" `;

    // Attributes
    if (attrs) {
      for (const [attrKey, attrVal] of Object.entries(attrs)) {
        const attrType = attrVal.type_ as HashType;
        const attrTypeName = HashTypeToXmlType[attrType];
        let attrDataString = '';
        if (attrTypeName) {
          // It is a Karabo Attribute (Typed)
          const attrWriter = WRITER_MAP[attrType];
          // Since the attrType has been successfuly used as an index to obtain
          // the attrTypeName, the attrType can be trusted as a WRITER_MAP key
          // and hence the attrWriter! below should be trustable as well.
          const generator = attrWriter!(attrVal);
          for (const chunk of generator) {
            attrDataString += chunk;
          }
          // Format: KRB_[TYPE]:[VALUE]
          const encodedAttr = `KRB_${attrTypeName}:${attrDataString}`;
          yield `${attrKey}=${quoteAttr(encodedAttr)} `;
        } else {
          // Standard XML Attribute (String)
          yield `${attrKey}=${quoteAttr(String(attrVal))} `;
        }
      }
    }

    yield '>';

    // Value Content
    yield* valueWriter!(value);

    // Close Tag
    yield `</${key}>`;
  }
}

// ============================================================================

const WRITER_MAP: Partial<Record<HashType, (data: any) => Generator<string>>> =
  {
    [HashType.Bool]: yield_xml_bool,

    [HashType.Char]: yield_xml_simple,
    [HashType.Int8]: yield_xml_simple,
    [HashType.UInt8]: yield_xml_simple,
    [HashType.Int16]: yield_xml_simple,
    [HashType.UInt16]: yield_xml_simple,
    [HashType.Int32]: yield_xml_simple,
    [HashType.UInt32]: yield_xml_simple,
    [HashType.Int64]: yield_xml_simple,
    [HashType.UInt64]: yield_xml_simple,
    [HashType.Float]: yield_xml_simple,
    [HashType.Double]: yield_xml_simple,

    [HashType.VectorBool]: yield_xml_vector_bool,
    [HashType.VectorChar]: yield_xml_vector_char,

    [HashType.VectorInt8]: yield_xml_vector_simple,
    [HashType.VectorUInt8]: yield_xml_vector_simple,
    [HashType.VectorInt16]: yield_xml_vector_simple,
    [HashType.VectorUInt16]: yield_xml_vector_simple,
    [HashType.VectorInt32]: yield_xml_vector_simple,
    [HashType.VectorUInt32]: yield_xml_vector_simple,
    [HashType.VectorInt64]: yield_xml_vector_simple,
    [HashType.VectorUInt64]: yield_xml_vector_simple,
    [HashType.VectorFloat]: yield_xml_vector_simple,
    [HashType.VectorDouble]: yield_xml_vector_simple,

    [HashType.String]: yield_xml_simple,
    [HashType.VectorString]: yield_xml_vector_simple,

    [HashType.Hash]: yield_xml_hash,
    [HashType.VectorHash]: yield_xml_vector_hash,
    [HashType.Schema]: yield_xml_schema,
    [HashType.None_]: yield_xml_simple,
    [HashType.ByteArray]: yield_xml_byte_array,
  };

// ============================================================================

function* yieldXML(data: Hash): Generator<string> {
  const keys = Array.from(data.keys());
  const size = keys.length;

  if (size === 1) {
    // Check if the single element is a Hash
    const firstKey = keys[0];
    const firstVal = data.get(firstKey);

    if (firstVal instanceof Hash) {
      yield* yield_xml_hash(data);
      return;
    }
  }

  // Else wrap in artificial root
  yield '<root KRB_Artificial="">';
  yield* yield_xml_hash(data);
  yield '</root>';
}

export function encodeXML(data: Hash): string {
  let result = '';
  for (const chunk of yieldXML(data)) {
    result += chunk;
  }
  return result;
}

/**
 * saveToFile a Hash with xml format.
 */
export function saveToFile(hash: Hash | null, filepath: string): void {
  if (hash === null) {
    throw new Error('Cannot save null hash');
  }
  if (!(hash instanceof Hash)) {
    throw new Error('Input is not a Hash object');
  }

  // Ensure directory exists
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Check if it is a directory
  if (fs.existsSync(filepath) && fs.lstatSync(filepath).isDirectory()) {
    throw new Error(`Path is a directory: ${filepath}`);
  }

  const xmlContent = encodeXML(hash);
  fs.writeFileSync(filepath, xmlContent, { encoding: 'utf-8' });
}
