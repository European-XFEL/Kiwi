import {
  BaseBinding,
  BoolBinding,
  StringBinding,
  Int8Binding,
  Int16Binding,
  Int32Binding,
  Int64Binding,
  UInt8Binding,
  UInt16Binding,
  UInt32Binding,
  UInt64Binding,
  FloatBinding,
  DoubleBinding,
} from '@/lib/binding/api';
import {
  BoolButtonDelegate,
  StringButtonDelegate,
  ProgressBarDelegate,
  type DelegateProps,
  type TableDelegate,
} from './delegates';
import { getStateColor } from '@/lib/Indicators';
import { formatTableCell } from './formatTableCell';
import { getMinMax } from './getMinMax';

export type { DelegateProps, TableDelegate } from './delegates';

const numericBindings = [
  Int8Binding,
  Int16Binding,
  Int32Binding,
  Int64Binding,
  UInt8Binding,
  UInt16Binding,
  UInt32Binding,
  UInt64Binding,
  FloatBinding,
  DoubleBinding,
];

export function getDisplayDelegate(binding: BaseBinding): TableDelegate {
  if (binding.displayType === 'State') {
    return {
      getStyle: ({ value }) => ({
        backgroundColor: getStateColor(formatTableCell(value, binding), ''),
        textAlign: 'center',
      }),
    };
  }
  const parts = binding.displayType.split('|');
  const prefix = parts[0];
  if (prefix === 'TableBoolButton' && binding instanceof BoolBinding) {
    return { Component: BoolButtonDelegate };
  }
  if (prefix === 'TableStringButton' && binding instanceof StringBinding) {
    return { Component: StringButtonDelegate };
  }
  const numeric = numericBindings.some((Binding) => binding instanceof Binding);
  if (prefix === 'TableProgressBar' && numeric) {
    let limits: ReturnType<typeof getMinMax>;
    try {
      limits = getMinMax(binding);
    } catch {
      return {};
    }
    return {
      Component: (props: DelegateProps) => (
        <ProgressBarDelegate {...props} limits={limits} />
      ),
    };
  }
  if (
    prefix === 'TableColor' &&
    (numeric || binding instanceof StringBinding)
  ) {
    const colors = new URLSearchParams(parts.length === 2 ? parts[1] : '');
    const validated = new Map<string, string>();
    colors.forEach((color, key) => {
      if (validated.has(key)) {
        return;
      }
      validated.set(key, CSS.supports('background-color', color) ? color : '');
    });
    const defaultColor = validated.get('default') ?? '';
    validated.delete('default');
    return {
      getStyle: ({ value }) => ({
        backgroundColor:
          validated.get(formatTableCell(value, binding)) ?? defaultColor,
        textAlign: 'center',
      }),
    };
  }
  return {};
}
