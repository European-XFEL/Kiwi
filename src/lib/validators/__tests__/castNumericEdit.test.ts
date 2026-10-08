import { HashAttributes } from '@/karabo/data/api';
import { FloatValue, DoubleValue } from '@/karabo/data/types';
import {
  BindingRoot,
  DeviceProxy,
  DoubleBinding,
  FloatBinding,
  PropertyProxy,
  StringBinding,
  Int32Binding,
} from '../../binding/api';
import { castNumericEdit } from '../castNumericEdit';

it('casts edit values through their binding without changing live values', () => {
  const binding = new StringBinding({ value: 'device' });

  const device = new DeviceProxy('DEVICE');
  device.binding = new BindingRoot();
  device.binding.value!.set('name', binding);
  device.binding.value!.set('count', new Int32Binding());
  const proxy = new PropertyProxy(device, 'name');
  proxy.edit_value = 'edit';
  expect(proxy.edit_value.value_).toBe('edit');
  expect(proxy.value).toBe('device');
  proxy.edit_value = undefined;
  expect(proxy.edit_value).toBeUndefined();
  const count = new PropertyProxy(device, 'count');
  count.edit_value = 42;
  expect(count.edit_value.value_).toBe(42);
});

it('keeps the existing float type cast separate from edit constraints', () => {
  const binding = new FloatBinding({
    attributes: new HashAttributes({ maxInc: 2 }),
  });
  binding.setValue('3junk', undefined);
  expect(binding.value).toEqual(new FloatValue(3));
  expect(castNumericEdit(binding, '3junk')).toBeUndefined();
  expect(castNumericEdit(binding, 3)).toEqual(new FloatValue(3));
});

it.each([
  [{ minInc: -2, maxExc: 4 }, -2],
  [{ minInc: -2, maxExc: 4 }, 4],
  [{ minInc: -2 }, -2.1],
  [{ minExc: 0, maxInc: 2 }, 0],
  [{ minExc: 0, maxInc: 2 }, 2],
  [{ options: [1, 2] }, 3],
  [{ options: [1, 2] }, 2],
] as const)(
  'casts %p without enforcing schema constraints on %p',
  (attributes, value) => {
    const binding = new DoubleBinding({
      attributes: new HashAttributes(attributes),
    });
    const result = castNumericEdit(binding, value);
    expect(result).toEqual(new DoubleValue(value));
  }
);

it.each([
  NaN,
  Infinity,
  -Infinity,
  '',
  '3junk',
  ' 3',
  true,
  null,
  {},
  new DoubleValue(Infinity),
])('rejects nonnumeric or nonfinite edits %p', (value) => {
  expect(castNumericEdit(new DoubleBinding(), value)).toBeUndefined();
});

it('casts to the binding wire type without checking schema limits', () => {
  expect(castNumericEdit(new FloatBinding(), new DoubleValue(1.25))).toEqual(
    new FloatValue(1.25)
  );
  expect(castNumericEdit(new DoubleBinding(), '1.25e2')).toEqual(
    new DoubleValue(125)
  );
  const binding = new FloatBinding({
    attributes: new HashAttributes({ maxExc: 1 }),
  });
  expect(castNumericEdit(binding, 0.999999999)).toEqual(new FloatValue(1));
  expect(castNumericEdit(new FloatBinding(), 1e39)).toBeUndefined();
});

it.each([-3.4028234663852886e38, 3.4028234663852886e38])(
  'wraps the finite float32 boundary %p without enforcing binding limits',
  (value) => {
    const binding = new FloatBinding();
    expect(castNumericEdit(binding, value)).toEqual(new FloatValue(value));
  }
);

it('casts staged edits without enforcing schema constraints', () => {
  const device = new DeviceProxy('DEVICE');
  device.binding = new BindingRoot();
  device.binding.value!.set('speed', new DoubleBinding({ value: 1.25 }));
  const proxy = new PropertyProxy(device, 'speed');
  proxy.edit_value = 3;
  device.binding.value!.set(
    'speed',
    new DoubleBinding({ attributes: new HashAttributes({ maxInc: 2 }) })
  );
  device.schema_update.fire();
  expect(proxy.edit_value).toEqual(new DoubleValue(3));
  const missing = new PropertyProxy(device, 'missing');
  expect(() => {
    missing.edit_value = 3;
  }).not.toThrow();
  expect(missing.edit_value).toBeUndefined();
});
