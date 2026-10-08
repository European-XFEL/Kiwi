import {
  BindingRoot,
  DeviceProxy,
  DoubleBinding,
  PropertyProxy,
} from '../../api';
import { getEditorValue } from '../getEditorValue';

it('prefers staged zero over the live binding value', () => {
  const device = new DeviceProxy('DEVICE');
  device.binding = new BindingRoot();
  device.binding.value!.set('speed', new DoubleBinding({ value: 1.25 }));
  const proxy = new PropertyProxy(device, 'speed');
  expect(getEditorValue(proxy)).toBe(1.25);
  proxy.edit_value = 0;
  expect(getEditorValue(proxy)).toBe(0);
  proxy.edit_value = undefined;
  expect(getEditorValue(proxy)).toBe(1.25);
  expect(getEditorValue(undefined)).toBeUndefined();
});
