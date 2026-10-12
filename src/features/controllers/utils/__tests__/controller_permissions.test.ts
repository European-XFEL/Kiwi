import { AccessLevel, AccessMode, Hash } from '@/karabo/data/api';
import { DeviceProxy, PropertyProxy, ProxyStatus } from '@/lib/binding/api';
import { Configurable, StringElement } from '@/testing';
import { isControllerEditable, isProxyAllowed } from '../controller_semantics';

it('refreshes editability through real schema and configuration updates', () => {
  class EditableDevice extends Configurable {
    static state = new StringElement({ accessMode: AccessMode.READONLY });
    static action = new StringElement({
      accessMode: AccessMode.RECONFIGURABLE,
      allowedStates: ['STOPPED'],
      requiredAccessLevel: AccessLevel.OPERATOR,
    });
  }
  class ReadOnlyDevice extends EditableDevice {
    static action = new StringElement({ accessMode: AccessMode.READONLY });
  }
  const device = new DeviceProxy('DEV');
  device.status = ProxyStatus.ALIVE;
  const proxy = new PropertyProxy(device, 'action');
  proxy.root.handleDeviceSchema(EditableDevice.getClassSchema());
  expect(isProxyAllowed(proxy, AccessLevel.OPERATOR)).toBe(false);
  proxy.root.handleDeviceConfiguration(
    new Hash('state', 'STOPPED', 'action', 'ready')
  );
  expect(proxy.value).toBe('ready');
  expect(isProxyAllowed(proxy, AccessLevel.OPERATOR)).toBe(true);
  expect(isControllerEditable(proxy, AccessLevel.OPERATOR)).toBe(true);
  expect(isProxyAllowed(proxy, AccessLevel.OBSERVER)).toBe(false);
  proxy.root.handleDeviceConfiguration(
    new Hash('state', 'STARTED', 'action', 'running')
  );
  expect(proxy.value).toBe('running');
  expect(isProxyAllowed(proxy, AccessLevel.OPERATOR)).toBe(false);
  expect(isControllerEditable(proxy, AccessLevel.OPERATOR)).toBe(false);
  proxy.root.handleDeviceSchema(ReadOnlyDevice.getClassSchema());
  proxy.root.handleDeviceConfiguration(
    new Hash('state', 'STOPPED', 'action', 'read only')
  );
  expect(proxy.value).toBe('read only');
  expect(isProxyAllowed(proxy, AccessLevel.EXPERT)).toBe(false);
  expect(isControllerEditable(proxy, AccessLevel.EXPERT)).toBe(false);
  proxy.root.handleDeviceSchema(EditableDevice.getClassSchema());
  expect(isControllerEditable(proxy, AccessLevel.OPERATOR)).toBe(false);
  proxy.root.handleDeviceConfiguration(
    new Hash('state', 'STOPPED', 'action', 'restored')
  );
  expect(proxy.value).toBe('restored');
  expect(isProxyAllowed(proxy, AccessLevel.OPERATOR)).toBe(true);
  expect(isControllerEditable(proxy, AccessLevel.OPERATOR)).toBe(true);
  proxy.dispose();
});
