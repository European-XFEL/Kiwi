import {
  BindingRoot,
  DeviceProxy,
  StringBinding,
  PropertyProxy,
} from '@/lib/binding/api';
import { StringValue } from '@/karabo/data/api';

describe('The basic proxy test', () => {
  it('PropertyProxy - Edit', () => {
    const stringProperty = new StringBinding({ value: 'karabo' });
    const rootBinding = new BindingRoot();
    rootBinding.value!.set('stringProperty', stringProperty);
    expect(rootBinding.value!.length).toBe(1);

    const root_proxy = new DeviceProxy('TEST_KIWI');
    root_proxy.binding = rootBinding;

    const property_proxy = new PropertyProxy(root_proxy, 'stringProperty');
    expect(property_proxy.binding).toBeInstanceOf(StringBinding);

    expect(property_proxy.value).toBe('karabo');
    expect(property_proxy.edit_value).toBeUndefined();
    property_proxy.edit_value = 'koala';
    expect(property_proxy.edit_value).toStrictEqual(new StringValue('koala'));

    // we have casting
    property_proxy.edit_value = 2026;
    expect(property_proxy.edit_value).toStrictEqual(new StringValue('2026'));

    // Not existing property
    const not_property_proxy = new PropertyProxy(root_proxy, 'notAvailable');
    expect(not_property_proxy.binding).toBeUndefined();
    expect(not_property_proxy.edit_value).toBeUndefined();
  });
});
