import {
  BindingRoot,
  DeviceProxy,
  DoubleBinding,
  NodeBinding,
  StringBinding,
  PropertyProxy,
} from '@/lib/binding/api';
import { ProxyStatus } from '@/lib/binding/ProxyStatus';
import { StringValue } from '@/karabo/data/api';

describe('The basic proxy test', () => {
  it('clears a submitted edit without notifying subscribers or changing the binding', () => {
    const device = new DeviceProxy('TEST_KIWI');
    device.binding = new BindingRoot();
    device.binding.value!.set('speed', new DoubleBinding({ value: 1.25 }));
    const proxy = new PropertyProxy(device, 'speed');
    const onEdit = jest.fn();
    const unsubscribe = proxy.edit_update(onEdit);
    proxy.edit_value = 3.5;
    onEdit.mockClear();

    proxy.clearEditValue();

    expect(proxy.edit_value).toBeUndefined();
    expect(proxy.value).toBe(1.25);
    expect(onEdit).not.toHaveBeenCalled();
    proxy.edit_value = 4.5;
    expect(proxy.edit_value.value_).toBe(4.5);
    expect(onEdit).toHaveBeenCalledTimes(1);
    unsubscribe();
    proxy.dispose();
  });

  it('notifies edit subscribers when a numeric edit is staged or cleared', () => {
    const rootProxy = new DeviceProxy('TEST_KIWI');
    const rootBinding = new BindingRoot();
    rootBinding.value!.set('speed', new DoubleBinding({ value: 1.25 }));
    rootProxy.binding = rootBinding;
    const proxy = new PropertyProxy(rootProxy, 'speed');
    const onEdit = jest.fn();
    const unsubscribe = proxy.edit_update(onEdit);

    proxy.edit_value = 0;
    expect(proxy.edit_value.value_).toBe(0);
    expect(proxy.value).toBe(1.25);
    expect(onEdit).toHaveBeenCalledWith(proxy);

    proxy.edit_value = undefined;
    expect(proxy.edit_value).toBeUndefined();
    expect(proxy.value).toBe(1.25);
    expect(onEdit).toHaveBeenCalledTimes(2);

    unsubscribe();
    proxy.edit_value = 2;
    expect(onEdit).toHaveBeenCalledTimes(2);
    proxy.dispose();

    const missingProxy = new PropertyProxy(rootProxy, 'missing');
    expect(() => {
      missingProxy.edit_value = undefined;
    }).not.toThrow();
    missingProxy.dispose();
  });

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

  it('PropertyProxy - Existing tracks schema confirmation explicitly', () => {
    const rootBinding = new BindingRoot();
    const rootProxy = new DeviceProxy('TEST_KIWI');
    rootProxy.binding = rootBinding;
    rootProxy.status = ProxyStatus.ONLINEREQUESTED;

    const missingProxy = new PropertyProxy(rootProxy, 'missingProperty');
    expect(missingProxy.binding_existing).toBe(true);

    rootBinding.value!.set(
      'otherProperty',
      new StringBinding({ value: 'here' })
    );
    rootProxy.schema_update.fire();
    expect(missingProxy.binding_existing).toBe(false);

    rootBinding.value!.set(
      'missingProperty',
      new StringBinding({ value: 'now-here' })
    );
    rootProxy.schema_update.fire();
    expect(missingProxy.binding).toBeInstanceOf(StringBinding);
    expect(missingProxy.binding_existing).toBe(true);

    missingProxy.dispose();
  });

  it('PropertyProxy - schema update seeds pipeline parent path to connect', () => {
    const rootBinding = new BindingRoot();
    const rootProxy = new DeviceProxy('TEST_KIWI');
    rootProxy.binding = rootBinding;

    const connectPipeline = jest.spyOn(rootProxy, 'connectPipeline');

    const proxy = new PropertyProxy(rootProxy, 'channel.value');
    expect(proxy.pipeline_parent_path).toBe('');

    const outputBinding = new NodeBinding();
    outputBinding.displayType = 'OutputChannel';
    outputBinding.value.set('value', new StringBinding({ value: 'live' }));
    rootBinding.value!.set('channel', outputBinding);

    rootProxy.schema_update.fire();

    expect(proxy.pipeline_parent_path).toBe('channel');
    expect(connectPipeline).toHaveBeenCalledTimes(1);

    proxy.dispose();
  });

  it('PropertyProxy - schema update subscribes when a monitored proxy gains a pipeline parent path', () => {
    const rootBinding = new BindingRoot();
    const rootProxy = new DeviceProxy('TEST_KIWI');
    rootProxy.binding = rootBinding;

    const removeMonitor = jest.fn();
    jest.spyOn(rootProxy, 'addMonitor').mockReturnValue(removeMonitor);
    const connectPipeline = jest.spyOn(rootProxy, 'connectPipeline');

    const proxy = new PropertyProxy(rootProxy, 'channel.value');
    proxy.startMonitoring();

    const outputBinding = new NodeBinding();
    outputBinding.displayType = 'OutputChannel';
    outputBinding.value.set('value', new StringBinding({ value: 'live' }));
    rootBinding.value!.set('channel', outputBinding);

    rootProxy.schema_update.fire();

    expect(proxy.pipeline_parent_path).toBe('channel');
    expect(connectPipeline).toHaveBeenCalledWith('channel');

    proxy.stopMonitoring();
    proxy.dispose();
  });

  it('PropertyProxy - schema update retargets pipeline subscription when a monitored proxy changes output channel parent', () => {
    const rootBinding = new BindingRoot();
    const channelBinding = new NodeBinding();
    channelBinding.displayType = 'OutputChannel';
    const innerBinding = new NodeBinding();
    innerBinding.value.set('value', new StringBinding({ value: 'live' }));
    channelBinding.value.set('inner', innerBinding);
    rootBinding.value!.set('channel', channelBinding);

    const rootProxy = new DeviceProxy('TEST_KIWI');
    rootProxy.binding = rootBinding;

    const removeMonitor = jest.fn();
    jest.spyOn(rootProxy, 'addMonitor').mockReturnValue(removeMonitor);
    const connectPipeline = jest.spyOn(rootProxy, 'connectPipeline');
    const disconnectPipeline = jest
      .spyOn(rootProxy, 'disconnectPipeline')
      .mockImplementation(() => undefined);

    const proxy = new PropertyProxy(rootProxy, 'channel.inner.value');
    proxy.startMonitoring();
    connectPipeline.mockClear();
    disconnectPipeline.mockClear();

    const nextChannelBinding = new NodeBinding();
    const nextInnerBinding = new NodeBinding();
    nextInnerBinding.displayType = 'OutputChannel';
    nextInnerBinding.value.set('value', new StringBinding({ value: 'live' }));
    nextChannelBinding.value.set('inner', nextInnerBinding);
    rootBinding.value!.set('channel', nextChannelBinding);

    rootProxy.schema_update.fire();

    expect(proxy.pipeline_parent_path).toBe('channel.inner');
    expect(disconnectPipeline).toHaveBeenCalledWith('channel');
    expect(connectPipeline).toHaveBeenCalledWith('channel.inner');

    proxy.stopMonitoring();
    proxy.dispose();
  });

  it('PropertyProxy - schema update disconnects pipeline when a monitored proxy loses its output channel', () => {
    const rootBinding = new BindingRoot();
    const outputBinding = new NodeBinding();
    outputBinding.displayType = 'OutputChannel';
    outputBinding.value.set('value', new StringBinding({ value: 'live' }));
    rootBinding.value!.set('channel', outputBinding);

    const rootProxy = new DeviceProxy('TEST_KIWI');
    rootProxy.binding = rootBinding;

    const removeMonitor = jest.fn();
    jest.spyOn(rootProxy, 'addMonitor').mockReturnValue(removeMonitor);
    const connectPipeline = jest.spyOn(rootProxy, 'connectPipeline');
    const disconnectPipeline = jest
      .spyOn(rootProxy, 'disconnectPipeline')
      .mockImplementation(() => undefined);

    const proxy = new PropertyProxy(rootProxy, 'channel.value');
    proxy.startMonitoring();
    connectPipeline.mockClear();
    disconnectPipeline.mockClear();

    const nextChannelBinding = new NodeBinding();
    nextChannelBinding.value.set('value', new StringBinding({ value: 'live' }));
    rootBinding.value!.set('channel', nextChannelBinding);

    rootProxy.schema_update.fire();

    expect(proxy.pipeline_parent_path).toBe('');
    expect(disconnectPipeline).toHaveBeenCalledWith('channel');
    expect(connectPipeline).not.toHaveBeenCalled();

    proxy.dispose();
  });

  it('PropertyProxy - dispose stops monitoring when the proxy is still monitored', () => {
    const rootBinding = new BindingRoot();
    const outputBinding = new NodeBinding();
    outputBinding.displayType = 'OutputChannel';
    outputBinding.value.set('value', new StringBinding({ value: 'live' }));
    rootBinding.value!.set('channel', outputBinding);

    const rootProxy = new DeviceProxy('TEST_KIWI');
    rootProxy.binding = rootBinding;

    const removeMonitor = jest.fn();
    jest.spyOn(rootProxy, 'addMonitor').mockReturnValue(removeMonitor);
    const disconnectPipeline = jest
      .spyOn(rootProxy, 'disconnectPipeline')
      .mockImplementation(() => undefined);

    const proxy = new PropertyProxy(rootProxy, 'channel.value');
    proxy.startMonitoring();
    proxy.dispose();

    expect(removeMonitor).toHaveBeenCalledTimes(1);
    expect(disconnectPipeline).toHaveBeenCalledWith('channel');
    expect(proxy.isMonitored).toBe(false);
  });

  it('PropertyProxy - repeated stopMonitoring attempts keep calling pipeline disconnect', () => {
    const rootBinding = new BindingRoot();
    const outputBinding = new NodeBinding();
    outputBinding.displayType = 'OutputChannel';
    outputBinding.value.set('value', new StringBinding({ value: 'live' }));
    rootBinding.value!.set('channel', outputBinding);

    const rootProxy = new DeviceProxy('TEST_KIWI');
    rootProxy.binding = rootBinding;

    const removeMonitor = jest.fn();
    jest.spyOn(rootProxy, 'addMonitor').mockReturnValue(removeMonitor);
    const disconnectPipeline = jest
      .spyOn(rootProxy, 'disconnectPipeline')
      .mockImplementation(() => undefined);

    const proxy = new PropertyProxy(rootProxy, 'channel.value');
    proxy.startMonitoring();

    proxy.stopMonitoring();
    proxy.stopMonitoring();

    expect(removeMonitor).toHaveBeenCalledTimes(1);
    expect(disconnectPipeline).toHaveBeenCalledTimes(2);
    expect(proxy.isMonitored).toBe(false);

    proxy.dispose();
  });

  it('PropertyProxy - repeated startMonitoring increments monitor and pipeline subscriptions', () => {
    const rootBinding = new BindingRoot();
    const outputBinding = new NodeBinding();
    outputBinding.displayType = 'OutputChannel';
    outputBinding.value.set('value', new StringBinding({ value: 'live' }));
    rootBinding.value!.set('channel', outputBinding);

    const rootProxy = new DeviceProxy('TEST_KIWI');
    rootProxy.binding = rootBinding;

    const removeMonitor = jest.fn();
    jest.spyOn(rootProxy, 'addMonitor').mockReturnValue(removeMonitor);
    const connectPipeline = jest.spyOn(rootProxy, 'connectPipeline');

    const proxy = new PropertyProxy(rootProxy, 'channel.value');

    proxy.startMonitoring();
    proxy.startMonitoring();

    expect(rootProxy.addMonitor).toHaveBeenCalledTimes(2);
    expect(connectPipeline).toHaveBeenCalledTimes(2);
    expect(proxy.isMonitored).toBe(true);

    proxy.stopMonitoring();
    proxy.dispose();
  });
});
