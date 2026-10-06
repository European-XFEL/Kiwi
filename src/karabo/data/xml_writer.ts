import { Hash, HashList, Schema } from './hash';
import { HashType, HashTypeToXmlType } from './typenums';
import { wrap } from './types';
import { escapeXml, isTypedArray, quoteAttr, toBase64, unwrap } from './utils';

function* yield_xml_simple(data: any): Generator<string> {
  yield escapeXml(String(unwrap(data)));
}

function* yield_xml_bool(data: any): Generator<string> {
  const val = unwrap(data);
  yield escapeXml(val ? '1' : '0');
}

function* yield_xml_vector_simple(data: any): Generator<string> {
  const val = unwrap(data);
  // Numeric Karabo vectors extend typed arrays, which Array.isArray does not
  // recognize.
  if (Array.isArray(val) || isTypedArray(val)) {
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
  yield escapeXml((data as Schema).name);
  yield ':';
  // We need to render the internal Hash of the schema to a string
  const innerHashGen = yieldXML((data as Schema).hash);
  let innerXml = '';
  for (const chunk of innerHashGen) {
    innerXml += chunk;
  }
  yield escapeXml(innerXml);
}

// ============================================================================

function* yield_xml_hash(data: Hash): Generator<string> {
  for (const [key, rawValue, attrs] of data.iterall()) {
    const value = wrap(rawValue);
    const valueType = value.type_ as HashType;
    const valueTypeName = HashTypeToXmlType[valueType];
    const valueWriter = WRITER_MAP[valueType];
    if (!valueWriter) {
      throw new Error(`Unsupported XML Karabo type: ${valueType}`);
    }
    const structuredAttrs: [string, Hash | HashList | Schema][] = [];

    // Open Tag
    yield `<${key} KRB_Type="${valueTypeName}" `;

    // Attributes
    if (attrs) {
      for (const [attrKey, rawAttrVal] of attrs) {
        const attrVal = wrap(rawAttrVal);
        const attrType = attrVal.type_;
        const attrTypeName = HashTypeToXmlType[attrType];
        const attrWriter = WRITER_MAP[attrType];
        if (!attrWriter) {
          throw new Error(`Unsupported XML Karabo type: ${attrType}`);
        }
        if (
          attrVal instanceof Hash ||
          attrVal instanceof HashList ||
          attrVal instanceof Schema
        ) {
          const root = `_attr_root_${key}_${attrKey}`;
          structuredAttrs.push([root, attrVal]);
          yield `${attrKey}=${quoteAttr(`KRB_${attrTypeName}:${root}`)} `;
          continue;
        }
        let attrDataString = '';
        for (const chunk of attrWriter(attrVal)) {
          attrDataString += chunk;
        }
        // Writers already escape their text. Add only the surrounding quotes
        // here, so primitive attributes are escaped exactly once.
        yield `${attrKey}="KRB_${attrTypeName}:${attrDataString}" `;
      }
    }

    yield '>';

    for (const [root, value] of structuredAttrs) {
      yield `<${root}>`;
      yield* yield_xml_hash(new Hash(`${root}_value`, value));
      yield `</${root}>`;
    }

    // Value Content
    yield* valueWriter(value);

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
    const firstVal = data.getElement(firstKey).data;

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
