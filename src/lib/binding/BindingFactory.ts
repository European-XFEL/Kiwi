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
} from './BaseBinding';

export function buildBinding(
  schema: Schema,
  existing?: BindingRoot
): BindingRoot {
  const binding = existing ?? new BindingRoot();

  binding.classId = schema.name;

  const rootNamespace = binding.value;
  rootNamespace.clear_namespace();

  for (const [key, value, attrs] of schema.hash.iterall()) {
    const node = buildNode(value, attrs);
    rootNamespace.set(key, node);
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
  if (!_BINDINGS) _BINDINGS = { VECTOR_HASH: VectorHashBinding };
  return _BINDINGS;
}
