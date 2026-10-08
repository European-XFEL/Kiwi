import {
  AccessLevel,
  AccessMode,
  Hash,
  HashAttributes,
  encodeBinary,
  decodeBinary,
} from '@/karabo/data/api';
import { DoubleValue, FloatValue } from '@/karabo/data/types';
import {
  BaseBinding,
  BindingRoot,
  DeviceProxy,
  DoubleBinding,
  FloatBinding,
  NodeBinding,
  PropertyProxy,
  ProxyStatus,
  StringBinding,
} from '../binding/api';
import { SingletonContext } from '@/testing/utils';
import { Network } from '../singletons/Network';
import { Manager } from '../singletons/Manager';
import { send_property_changes } from '../request';

describe('send_property_changes', () => {
  let context: SingletonContext;
  let network: Network;
  let manager: Manager;
  let send: jest.SpyInstance;
  const property = (
    deviceId: string,
    path = 'speed',
    binding: BaseBinding = new DoubleBinding()
  ) => {
    const device = new DeviceProxy(deviceId);
    device.status = ProxyStatus.MONITORING;
    device.binding = new BindingRoot();
    binding.accessMode = AccessMode.RECONFIGURABLE;
    device.binding.value!.set(path, binding);
    const proxy = new PropertyProxy(device, path);
    proxy.edit_value = 3.5;
    return proxy;
  };
  beforeEach(() => {
    network = new Network();
    context = new SingletonContext({ network });
    manager = new Manager();
    const managerContext = new SingletonContext({ manager });
    const restore = context.restore.bind(context);
    context.restore = () => {
      managerContext.restore();
      restore();
    };
    send = jest.spyOn(network, 'onReconfigure').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
    context.restore();
  });

  it('groups sparse wrapped configurations per device, deduplicates proxies and registers before sending', () => {
    const speed = property('DEVICE_A');
    const float = new FloatBinding();
    float.accessMode = AccessMode.RECONFIGURABLE;
    const node = new NodeBinding();
    node.value.set('temperature', float);
    speed.root.binding.value!.set('node', node);
    const temperature = new PropertyProxy(speed.root, 'node.temperature');
    temperature.edit_value = 9;
    const other = property('DEVICE_B');
    const registration = jest.spyOn(manager, 'expect_properties');
    const edit = speed.edit_value;
    send_property_changes([speed, speed, temperature, other]);
    expect(send).toHaveBeenCalledTimes(2);
    expect(registration.mock.invocationCallOrder[0]).toBeLessThan(
      send.mock.invocationCallOrder[0]
    );
    const config = send.mock.calls[0][1] as Hash;
    expect(config.paths().sort()).toEqual(['node.temperature', 'speed']);
    const decoded = decodeBinary(new Uint8Array(encodeBinary(config)));
    expect(decoded.get('speed')).toEqual(new DoubleValue(3.5));
    expect(decoded.get('node.temperature')).toEqual(new FloatValue(9));
    expect(speed.edit_value).toBe(edit);
    expect(registration.mock.calls[0][1]).toEqual([speed, temperature]);
  });

  it('sends nothing when the caller supplies no staged proxies', () => {
    send_property_changes([]);
    expect(send).not.toHaveBeenCalled();
  });

  it('sends the staged wrapper without validating it again', () => {
    const proxy = property('DEVICE');
    const edit = proxy.edit_value;
    proxy.binding!.attributes = new HashAttributes({ maxInc: 2 });
    send_property_changes([proxy]);
    expect(send).toHaveBeenCalledTimes(1);
    expect((send.mock.calls[0][1] as Hash).get('speed')).toBe(edit);
    expect(proxy.edit_value).toBe(edit);
  });

  it.each(['readonly', 'access', 'state', 'offline'])(
    'leaves controller eligibility checks to the caller: %s',
    (condition) => {
      const proxy = property('DEVICE');
      if (condition === 'offline') {
        proxy.root.status = ProxyStatus.OFFLINE;
      }
      if (condition === 'readonly') {
        proxy.binding!.accessMode = AccessMode.READONLY;
      }
      if (condition === 'access') {
        proxy.binding!.requiredAccessLevel = AccessLevel.EXPERT;
      }
      if (condition === 'state') {
        proxy.binding!.attributes = new HashAttributes({
          allowedStates: ['ON'],
        });
        proxy.root.binding.value!.set(
          'state',
          new StringBinding({ value: 'OFF' })
        );
      }
      send_property_changes([proxy]);
      expect(send).toHaveBeenCalledTimes(1);
      expect((send.mock.calls[0][1] as Hash).getValue('speed')).toBe(3.5);
    }
  );

  it('sends the last edit at a duplicate path and acknowledges both proxies by key', () => {
    const first = property('DEVICE');
    const second = new PropertyProxy(first.root, 'speed');
    second.edit_value = 6.25;
    send_property_changes([first, second]);
    const config = send.mock.calls[0][1] as Hash;
    expect(config.getValue('speed')).toBe(6.25);
    manager.handle_reconfigureReply(
      new Hash(
        'success',
        true,
        'input',
        new Hash('deviceId', 'DEVICE', 'configuration', config)
      )
    );
    expect(first.edit_value).toBeUndefined();
    expect(second.edit_value).toBeUndefined();
  });

  it.each([-3.402823466e38, 3.402823466e38])(
    'sends a staged float boundary without invalidating it: %p',
    (value) => {
      const proxy = property('DEVICE', 'speed', new FloatBinding());
      proxy.edit_value = value;
      expect(proxy.edit_value).toEqual(new FloatValue(value));
      send_property_changes([proxy]);
      expect(send).toHaveBeenCalledTimes(1);
      expect((send.mock.calls[0][1] as Hash).get('speed')).toEqual(
        new FloatValue(value)
      );
      expect(proxy.edit_value).toEqual(new FloatValue(value));
    }
  );
});
