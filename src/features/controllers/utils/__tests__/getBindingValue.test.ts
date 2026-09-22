import {
  BindingRoot,
  DeviceProxy,
  DoubleBinding,
  Int64Binding,
  PropertyProxy,
  StringBinding,
} from '@/lib/binding/api';
import { toStringFloatValue, toStringValue } from '../getBindingValue';

function proxyFor(
  binding: DoubleBinding | Int64Binding | StringBinding
): PropertyProxy {
  const root = new DeviceProxy('DEV');
  root.binding = new BindingRoot();
  root.binding.value!.set('value', binding);
  return new PropertyProxy(root, 'value');
}

test('an unavailable binding displays no value or unit', () => {
  expect(toStringValue(undefined, true)).toBe('');
  expect(toStringFloatValue(undefined, 'g', '8', true)).toBe('');
});

test('float labels apply explicit precision', () => {
  const proxy = proxyFor(new DoubleBinding({ value: 1.23456789 }));
  expect(toStringFloatValue(proxy, 'f', '2')).toBe('1.23');
  expect(toStringFloatValue(proxy, '', '2')).toBe('1.2');
});

test('string labels preserve text and append their unit', () => {
  const binding = new StringBinding({ value: 'ready' });
  const proxy = proxyFor(binding);
  binding.unit_label = 'mm';
  expect(toStringValue(proxy, true)).toBe('ready mm');
  binding.setValue('0.125', undefined);
  expect(toStringValue(proxy, true)).toBe('0.125 mm');
});

test('integer labels preserve all digits without floating-point conversion', () => {
  const proxy = proxyFor(new Int64Binding({ value: 9007199254740993n }));
  expect(toStringValue(proxy)).toBe('9007199254740993');
});
