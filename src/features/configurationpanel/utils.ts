import icons from '@/assets/icons';
import {
  BoolBinding,
  ByteArrayBinding,
  CharBinding,
  DoubleBinding,
  FloatBinding,
  ImageBinding,
  NodeBinding,
  VectorBinding,
  VectorBoolBinding,
  VectorHashBinding,
  VectorStringBinding,
  type BaseBinding,
  type PropertyProxy,
} from '@/lib/binding/api';
import { HashType } from '@/karabo/data/api';
import { getStateColor } from '@/lib/Indicators';
import { ERROR_COLOR_ALPHA, OK_COLOR, UNKNOWN_COLOR_ALPHA } from '@/lib/colors';

const bases: Record<string, { radix: number; prefix: string }> = {
  bin: { radix: 2, prefix: '0b' },
  oct: { radix: 8, prefix: '0o' },
  hex: { radix: 16, prefix: '0x' },
};
const integerTypes = new Set([
  HashType.Int8,
  HashType.Int16,
  HashType.Int32,
  HashType.Int64,
  HashType.UInt8,
  HashType.UInt16,
  HashType.UInt32,
  HashType.UInt64,
]);
const FINAL_ALPHA = /,1\)$/;
const STRING_ESCAPE = /[\\']/g;
const VECTOR_PREVIEW_LIMIT = 1000;
const VECTOR_EDGE_ENTRIES = 3;

function formatVector(
  binding: VectorBinding,
  values: ArrayLike<unknown>
): string {
  const summarized = values.length > VECTOR_PREVIEW_LIMIT;
  let indices: number[];
  if (summarized) {
    indices = [
      0,
      1,
      2,
      values.length - 3,
      values.length - 2,
      values.length - 1,
    ];
  } else {
    indices = Array.from({ length: values.length }, (_, index) => index);
  }
  const entries = indices.map((index) => {
    const value = values[index];
    if (binding instanceof VectorBoolBinding) {
      return value ? 'True' : 'False';
    }
    if (binding instanceof VectorStringBinding) {
      return `'${String(value).replace(STRING_ESCAPE, '\\$&')}'`;
    }
    return String(value);
  });
  let separator = ' ';
  if (binding instanceof VectorStringBinding) {
    separator = ', ';
  } else {
    const width = entries.reduce(
      (width, entry) => Math.max(width, entry.length),
      0
    );
    for (let index = 0; index < entries.length; index++) {
      entries[index] = entries[index].padStart(width);
    }
  }
  if (summarized) {
    entries.splice(VECTOR_EDGE_ENTRIES, 0, '...');
  }
  return `[${entries.join(separator)}]`;
}

export function formatCurrentValue(proxy: PropertyProxy): string {
  const binding = proxy.binding;
  const value = proxy.value;
  if (
    !binding ||
    value === undefined ||
    binding instanceof NodeBinding ||
    binding instanceof VectorHashBinding ||
    binding instanceof ByteArrayBinding
  ) {
    return '';
  }
  const base = bases[binding.displayType];
  if (
    base &&
    (typeof value === 'bigint' ||
      (typeof value === 'number' && Number.isInteger(value)))
  ) {
    const negative = value < 0;
    const digits = (negative ? -value : value).toString(base.radix);
    return `${negative ? '-' : ''}${base.prefix}${digits}`;
  }
  let text: string;
  if (binding instanceof BoolBinding) {
    text = value ? 'True' : 'False';
  } else if (binding instanceof VectorBinding) {
    text = formatVector(binding, value as ArrayLike<unknown>);
  } else {
    text = String(value);
  }
  return text && binding.unit_label ? `${text} ${binding.unit_label}` : text;
}

export function getCurrentColor(proxy: PropertyProxy): string {
  if (proxy.binding?.displayType === 'State') {
    return getStateColor(String(proxy.value ?? '')).replace(
      FINAL_ALPHA,
      ',0.5)'
    );
  }
  switch (proxy.root.state) {
    case 'ERROR':
      return ERROR_COLOR_ALPHA;
    case 'UNKNOWN':
      return UNKNOWN_COLOR_ALPHA;
    default:
      return OK_COLOR;
  }
}

export function getPropertyIcon(binding: BaseBinding | undefined): string {
  if (!binding) {
    return icons.undefined;
  }
  if (binding.options.length > 0) {
    return icons.enum;
  }
  if (binding instanceof ImageBinding) {
    return icons.image;
  }
  if (binding instanceof BoolBinding) {
    return icons.boolean;
  }
  if (binding instanceof FloatBinding || binding instanceof DoubleBinding) {
    return icons.float;
  }
  if (integerTypes.has(binding.hashType)) {
    return icons.int;
  }
  if (binding.hashType === HashType.String || binding instanceof CharBinding) {
    return icons.string;
  }
  return icons.undefined;
}
