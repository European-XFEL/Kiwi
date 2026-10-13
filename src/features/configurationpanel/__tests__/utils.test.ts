import {
  DeviceProxy,
  PropertyProxy,
  VectorInt32Binding,
} from '@/lib/binding/api';
import { formatCurrentValue } from '../utils';

jest.mock('@/assets/icons', () => ({ __esModule: true, default: {} }));

test('elides large numeric vectors without copying or formatting the full vector', () => {
  const root = new DeviceProxy('DEV');
  root.binding.value!.set(
    'vector',
    new VectorInt32Binding({ value: new Int32Array(200_000).fill(1) })
  );
  const proxy = new PropertyProxy(root, 'vector');
  try {
    const text = formatCurrentValue(proxy);
    expect(text.length).toBeLessThan(100);
    expect(text).toBe('[1 1 1 ... 1 1 1]');
  } finally {
    proxy.dispose();
  }
});
