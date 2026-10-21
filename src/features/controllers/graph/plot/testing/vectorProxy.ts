import { DeviceProxy, PropertyProxy, VectorBinding } from '@/lib/binding/api';

export function makeVectorProxy(value: unknown) {
  const root = new DeviceProxy('DEV');
  const binding = new VectorBinding();
  binding.setValue(value, undefined);
  root.binding.value!.set('vector', binding);
  return new PropertyProxy(root, 'vector');
}
