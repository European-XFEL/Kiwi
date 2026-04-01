import {
  HashAttributes,
  Hash,
  Schema,
  KARABO_SCHEMA_NODE_TYPE,
  NodeType,
} from '@/karabo/data/api';

import {
  BaseBinding,
  BindingNamespace,
  BindingRoot,
  NodeBinding,
  VectorHashBinding,
  StringBinding,
  BoolBinding,
  FloatBinding,
  DoubleBinding,
  CharBinding,
  Int16Binding,
  Int32Binding,
  Int64Binding,
  UInt32Binding,
  UInt64Binding,
  VectorBoolBinding,
  VectorDoubleBinding,
  VectorFloatBinding,
  VectorStringBinding,
  VectorInt16Binding,
  VectorInt32Binding,
  VectorInt64Binding,
  VectorInt8Binding,
  VectorUInt16Binding,
  VectorUInt32Binding,
  VectorUInt64Binding,
  Int8Binding,
  UInt8Binding,
  UInt16Binding,
  VectorUInt8Binding,
} from './BaseBinding';

export function buildBinding(
  schema: Schema,
  existing?: BindingRoot
): BindingRoot {
  const binding = existing ?? new BindingRoot();

  binding.classId = schema.name;

  const rootNamespace = binding.value;
  rootNamespace!.clear_namespace();

  for (const [key, value, attrs] of schema.hash.iterall()) {
    const node = buildNode(value, attrs);
    rootNamespace!.set(key, node);
  }

  return binding;
}

export function buildNode(value: any, attrs: HashAttributes): BaseBinding {
  const a = new HashAttributes(attrs);
  const nodeType = a.getValue(KARABO_SCHEMA_NODE_TYPE) as NodeType;

  if (nodeType === NodeType.Leaf) {
    const valueType = a.getValue<string>('valueType');
    const factory = getBindings()[valueType];
    if (factory) {
      return new factory({ value: undefined, attributes: a });
    }
    const leaf = new BaseBinding({ value: undefined, attributes: a });
    return leaf;
  }

  if (nodeType === NodeType.Node) {
    const namespace = buildSubnamespace(value);
    const node = new NodeBinding({ value: namespace, attributes: a });
    return node;
  }

  throw new Error(`Not supported node type: ${String(nodeType)}`);
}

function buildSubnamespace(hashVal: Hash): BindingNamespace<BaseBinding> {
  const ns = new BindingNamespace<BaseBinding>();
  for (const [subname, subvalue, subattrs] of hashVal.iterall() as Iterable<
    [string, any, HashAttributes]
  >) {
    const subnode = buildNode(subvalue, subattrs);
    ns.set(subname, subnode);
  }
  return ns;
}

type BindingCtor = new (...args: any[]) => BaseBinding;

let _BINDINGS: Record<string, BindingCtor> | null = null;
function getBindings(): Record<string, BindingCtor> {
  if (!_BINDINGS)
    _BINDINGS = {
      STRING: StringBinding,
      BOOL: BoolBinding,
      CHAR: CharBinding,
      INT8: Int8Binding,
      UINT8: UInt8Binding,
      INT16: Int16Binding,
      UINT16: UInt16Binding,
      INT32: Int32Binding,
      UINT32: UInt32Binding,
      INT64: Int64Binding,
      UINT64: UInt64Binding,
      VECTOR_UINT8: VectorUInt8Binding,
      VECTOR_UINT16: VectorUInt16Binding,
      VECTOR_UINT32: VectorUInt32Binding,
      VECTOR_UINT64: VectorUInt64Binding,
      VECTOR_INT8: VectorInt8Binding,
      VECTOR_INT16: VectorInt16Binding,
      VECTOR_INT32: VectorInt32Binding,
      VECTOR_INT64: VectorInt64Binding,
      FLOAT: FloatBinding,
      DOUBLE: DoubleBinding,
      VECTOR_BOOL: VectorBoolBinding,
      VECTOR_STRING: VectorStringBinding,
      VECTOR_FLOAT: VectorFloatBinding,
      VECTOR_DOUBLE: VectorDoubleBinding,
      VECTOR_HASH: VectorHashBinding,
    };
  return _BINDINGS;
}
