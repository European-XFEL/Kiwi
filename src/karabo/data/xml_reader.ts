import sax from 'sax';
import { Hash, HashList, Schema } from './hash';
import { HashType, XmlTypeToHashType } from './typenums';
import * as Types from './types';
import * as fs from 'fs';

const parseXMLBool = (data: string): boolean => {
  const d = data.trim().toLowerCase();
  return d === '1' || d === 'true';
};

const parseXMLNumber = (data: string): number => Number(data);

const parseXMLBigInt = (data: string): bigint => {
  return BigInt(data.trim());
};

const parseXMLVectorNumber = (data: string): number[] => {
  if (!data || !data.trim()) {
    return [];
  }
  return data
    .trim()
    .split(/[,\s]+/)
    .map(Number);
};

const parseXMLVectorBigInt = (data: string): bigint[] => {
  if (!data || !data.trim()) {
    return [];
  }
  return data
    .trim()
    .split(/[,\s]+/)
    .map((val) => {
      return BigInt(val);
    });
};

const parseXMLVectorBool = (data: string): boolean[] => {
  if (!data || !data.trim()) {
    return [];
  }
  return data
    .trim()
    .split(/[,\s]+/)
    .map(parseXMLBool);
};

const parseXMLVectorString = (data: string): string[] => {
  if (!data) {
    return [];
  }
  return data.split(',').map((s) => s.trim());
};

const parseXMLByteArray = (data: string): Uint8Array => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(data, 'base64');
  } else {
    // Browser polyfill for atob
    const binString = atob(data);
    const len = binString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binString.charCodeAt(i);
    }
    return bytes;
  }
};

// ============================================================================

// --- Boolean ---
const read_xml_bool = (data: string) => new Types.BoolValue(parseXMLBool(data));
const read_xml_vector_bool = (data: string) =>
  new Types.VectorBoolValue(parseXMLVectorBool(data));

// --- 8-bit ---
const read_xml_int8 = (data: string) =>
  new Types.Int8Value(parseXMLNumber(data));
const read_xml_uint8 = (data: string) =>
  new Types.UInt8Value(parseXMLNumber(data));
const read_xml_vector_int8 = (data: string) =>
  new Types.VectorInt8Value(parseXMLVectorNumber(data));
const read_xml_vector_uint8 = (data: string) =>
  new Types.VectorUInt8Value(parseXMLVectorNumber(data));

// --- 16-bit ---
const read_xml_int16 = (data: string) =>
  new Types.Int16Value(parseXMLNumber(data));
const read_xml_uint16 = (data: string) =>
  new Types.UInt16Value(parseXMLNumber(data));
const read_xml_vector_int16 = (data: string) =>
  new Types.VectorInt16Value(parseXMLVectorNumber(data));
const read_xml_vector_uint16 = (data: string) =>
  new Types.VectorUInt16Value(parseXMLVectorNumber(data));

// --- 32-bit ---
const read_xml_int32 = (data: string) =>
  new Types.Int32Value(parseXMLNumber(data));
const read_xml_uint32 = (data: string) =>
  new Types.UInt32Value(parseXMLNumber(data));
const read_xml_vector_int32 = (data: string) =>
  new Types.VectorInt32Value(parseXMLVectorNumber(data));
const read_xml_vector_uint32 = (data: string) =>
  new Types.VectorUInt32Value(parseXMLVectorNumber(data));

// --- 64-bit ---
const read_xml_int64 = (data: string) =>
  new Types.Int64Value(parseXMLBigInt(data));
const read_xml_uint64 = (data: string) =>
  new Types.UInt64Value(parseXMLBigInt(data));
const read_xml_vector_int64 = (data: string) =>
  new Types.VectorInt64Value(parseXMLVectorBigInt(data));
const read_xml_vector_uint64 = (data: string) =>
  new Types.VectorUInt64Value(parseXMLVectorBigInt(data));

// --- Floats ---
const read_xml_float = (data: string) =>
  new Types.FloatValue(parseXMLNumber(data));
const read_xml_double = (data: string) =>
  new Types.DoubleValue(parseXMLNumber(data));
const read_xml_vector_float = (data: string) =>
  new Types.VectorFloatValue(parseXMLVectorNumber(data));
const read_xml_vector_double = (data: string) =>
  new Types.VectorDoubleValue(parseXMLVectorNumber(data));

// --- Strings & Chars ---
const read_xml_string = (data: string) => new Types.StringValue(data);
const read_xml_vector_string = (data: string) =>
  new Types.VectorStringValue(parseXMLVectorString(data));

const read_xml_char = (data: string) => {
  const num = Number(data);
  const val = isNaN(num) ? data.charCodeAt(0) : num;
  return new Types.CharValue(val);
};

const read_xml_vector_char = (data: string) =>
  new Types.VectorCharValue(parseXMLByteArray(data));

const read_xml_schema = (data: string): Schema | string => {
  // Karabo Schema string format: "[NAME]:[XML_CONTENT]"
  const splitIndex = data.indexOf(':');
  // Handle legacy string case where there is no colon
  if (splitIndex === -1) {
    return data;
  }
  const xmlPart = data.substring(splitIndex + 1).trim();
  const name = data.substring(0, splitIndex);

  // Attempt to parse; if not XML, return original string (Legacy fallback)
  if (!xmlPart.startsWith('<')) {
    return data;
  }

  return new Schema(name, decodeXML(xmlPart) as Hash);
};

const read_xml_empty = (_data: string) => null;

// ============================================================================

const READER_MAP: Record<HashType, (data: string) => any> = {
  [HashType.Bool]: read_xml_bool,
  [HashType.VectorBool]: read_xml_vector_bool,

  [HashType.Int8]: read_xml_int8,
  [HashType.UInt8]: read_xml_uint8,
  [HashType.VectorInt8]: read_xml_vector_int8,
  [HashType.VectorUInt8]: read_xml_vector_uint8,

  [HashType.Int16]: read_xml_int16,
  [HashType.UInt16]: read_xml_uint16,
  [HashType.VectorInt16]: read_xml_vector_int16,
  [HashType.VectorUInt16]: read_xml_vector_uint16,

  [HashType.Int32]: read_xml_int32,
  [HashType.UInt32]: read_xml_uint32,
  [HashType.VectorInt32]: read_xml_vector_int32,
  [HashType.VectorUInt32]: read_xml_vector_uint32,

  [HashType.Int64]: read_xml_int64,
  [HashType.UInt64]: read_xml_uint64,
  [HashType.VectorInt64]: read_xml_vector_int64,
  [HashType.VectorUInt64]: read_xml_vector_uint64,

  [HashType.Float]: read_xml_float,
  [HashType.Double]: read_xml_double,
  [HashType.VectorFloat]: read_xml_vector_float,
  [HashType.VectorDouble]: read_xml_vector_double,

  [HashType.String]: read_xml_string,
  [HashType.VectorString]: read_xml_vector_string,

  [HashType.Char]: read_xml_char,
  [HashType.VectorChar]: read_xml_vector_char,
  [HashType.ByteArray]: read_xml_vector_char,

  [HashType.Schema]: read_xml_schema,
  [HashType.None_]: read_xml_empty,

  [HashType.Hash]: (d) => d,
  [HashType.VectorHash]: (d) => d,
};

// ============================================================================

interface Context {
  type: 'Hash' | 'VectorHash' | 'String';
  container: any;
  key?: string;
  attrs: Record<string, string>;
  textBuffer: string[];
  schemaAttrs?: Set<string>;
  pendingSchemaAttrs?: Map<string, any>;
}

export class KaraboXmlParser {
  private stack: Context[] = [];
  private result: any = null;
  private rootName: string = '';
  private rootAttrs: Record<string, any> = {};

  public parse(xml: string): any {
    const parser = sax.parser(true, { trim: false });

    // Ensure parser errors are propagated
    parser.onerror = (e: any) => {
      throw e;
    };

    parser.onopentag = (node: any) => {
      this.startElement(node.name, node.attributes as Record<string, string>);
    };
    parser.ontext = (text: any) => {
      this.characters(text);
    };
    parser.onclosetag = (name: any) => {
      this.endElement(name);
    };

    parser.write(xml).close();

    // Finalize Root
    if (this.rootName === 'root' && 'KRB_Artificial' in this.rootAttrs) {
      return this.result;
    } else {
      if (this.result instanceof Hash || this.result instanceof HashList) {
        const h = new Hash();
        // The root attributes are now a mix of String and KaraboValue objects
        h.setElement(this.rootName, this.result, this.rootAttrs);
        return h;
      }
      return this.result;
    }
  }

  private startElement(name: string, attrs: Record<string, string>) {
    const krbType = attrs['KRB_Type'];
    let contextType: Context['type'] = 'Hash';

    if (krbType && krbType !== 'HASH' && krbType !== 'VECTOR_HASH') {
      contextType = 'String';
    } else if (krbType === 'VECTOR_HASH') {
      contextType = 'VectorHash';
    }

    const context: Context = {
      type: contextType,
      container: this.createContainer(contextType),
      key: name,
      attrs: { ...attrs },
      textBuffer: [],
      schemaAttrs: new Set(),
      pendingSchemaAttrs: new Map(),
    };

    // Pre-scan for Attributes that are actually nested structures
    for (const [_, v] of Object.entries(attrs)) {
      if (v.startsWith('KRB_') && v.includes(':')) {
        const [dtypeStr, svalue] = v.split(':', 2);
        const dtype = XmlTypeToHashType[dtypeStr.substring(4)];
        if (
          (dtype === HashType.Schema || dtype === HashType.VectorHash) &&
          svalue.startsWith('_attr_root_')
        ) {
          context.schemaAttrs?.add(svalue);
        }
      }
    }

    if (this.stack.length === 0) {
      this.rootName = name;
    }
    this.stack.push(context);
  }

  private characters(text: string) {
    if (this.stack.length > 0) {
      this.stack[this.stack.length - 1].textBuffer.push(text);
    }
  }

  private endElement(name: string) {
    const current = this.stack.pop();
    if (!current) {
      return;
    }

    const processedAttrs: Record<string, any> = {};

    for (const [key, rawVal] of Object.entries(current.attrs)) {
      if (key === 'KRB_Type') {
        // Not needed, only for parsing...
        continue;
      }

      if (rawVal.startsWith('KRB_') && rawVal.includes(':')) {
        const splitIdx = rawVal.indexOf(':');
        const dtypeStr = rawVal.substring(0, splitIdx);
        const svalue = rawVal.substring(splitIdx + 1);
        const dtype = XmlTypeToHashType[dtypeStr.substring(4)];

        if (dtype !== undefined) {
          if (dtype === HashType.Schema || dtype === HashType.VectorHash) {
            // Handle Complex Schema Attributes
            if (
              svalue.startsWith('_attr_root_') &&
              current.pendingSchemaAttrs?.has(svalue)
            ) {
              processedAttrs[key] = current.pendingSchemaAttrs.get(svalue);
            } else {
              processedAttrs[key] = svalue;
            }
          } else {
            // Handle Primitive Karabo Attributes
            const reader = READER_MAP[dtype];
            if (!reader) {
              throw new Error(
                `Missing reader for type: ${HashType[dtype] || dtype}`
              );
            }
            processedAttrs[key] = reader(svalue);
          }
        } else {
          console.warn(`Found unknown encoding: ${dtypeStr}`);
          continue;
        }
      } else {
        processedAttrs[key] = rawVal;
      }
    }

    // --- Resolve Element Value ---
    let finalValue: any;

    if (current.type === 'String') {
      const fullText = current.textBuffer.join('');
      // Also other attributes can be
      const typeName = current.attrs['KRB_Type'] || 'STRING';
      const typeEnum = XmlTypeToHashType[typeName];
      const reader = READER_MAP[typeEnum];
      finalValue = reader ? reader(fullText) : fullText;
    } else {
      finalValue = current.container;
    }

    // --- Attach to Parent ---
    if (this.stack.length > 0) {
      const parent = this.stack[this.stack.length - 1];

      // Check if this child was actually an "Attribute Container" required for table elements
      if (parent.schemaAttrs?.has(name)) {
        // Unwrap the value if it's inside a container Hash
        // e.g. <_attr_root_X> <_attr_root_X_value>REAL_VAL</...> ...
        let unwrappedValue = finalValue;
        if (finalValue instanceof Hash && finalValue.has(name + '_value')) {
          unwrappedValue = finalValue.get(name + '_value');
        }
        parent.pendingSchemaAttrs?.set(name, unwrappedValue);
        parent.schemaAttrs.delete(name);
      } else if (parent.type === 'VectorHash') {
        (parent.container as HashList).value_.push(finalValue);
      } else if (parent.type === 'Hash') {
        (parent.container as Hash).setElement(
          current.key!,
          finalValue,
          processedAttrs
        );
      }
    } else {
      this.result = finalValue;
      this.rootAttrs = processedAttrs;
    }
  }

  private createContainer(type: Context['type']): any {
    if (type === 'Hash') {
      return new Hash();
    }
    if (type === 'VectorHash') {
      return new HashList([]);
    }
    return null;
  }
}

export function decodeXML(data: string): Hash | any {
  const parser = new KaraboXmlParser();
  return parser.parse(data);
}

/**
 * loadFromFile a Hash with xml format.
 */
export function loadFromFile(filepath: string): any {
  if (!fs.existsSync(filepath)) {
    throw new Error(`File not found: ${filepath}`);
  }
  const content = fs.readFileSync(filepath, 'utf-8');
  return decodeXML(content);
}
