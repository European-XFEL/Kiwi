import { Hash } from '@/karabo/data/api';
import { DoubleValue, FloatValue } from '@/karabo/data/types';
import {
  BindingRoot,
  DeviceProxy,
  DoubleBinding,
  PropertyProxy,
} from '@/lib/binding/api';
import { SingletonContext } from '@/testing/utils';
import { Network } from '../Network';
import { Manager } from '../Manager';
import { showMessageBox } from '../../messagebox';

jest.mock('../../messagebox', () => ({ showMessageBox: jest.fn() }));

describe('reconfiguration replies', () => {
  let context: SingletonContext;
  let manager: Manager;
  let network: Network;
  let device: DeviceProxy;
  let proxy: PropertyProxy;
  const configuration = (value: number) =>
    new Hash('speed', new DoubleValue(value));
  const reply = (config: Hash, success = true, deviceId = 'DEVICE') =>
    new Hash(
      'success',
      success,
      'input',
      new Hash('deviceId', deviceId, 'configuration', config),
      'failureReason',
      'Denied Details:\nState changed'
    );

  beforeEach(() => {
    network = new Network();
    context = new SingletonContext({ network, topology: { clear: jest.fn() } });
    manager = new Manager();
    device = new DeviceProxy('DEVICE');
    device.binding = new BindingRoot();
    device.binding.value!.set('speed', new DoubleBinding({ value: 1.25 }));
    proxy = new PropertyProxy(device, 'speed');
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.restoreAllMocks();
    context.restore();
  });

  it('ignores a reply when the weak device reference is gone', () => {
    proxy.edit_value = 3.5;
    manager.expect_properties(device, [proxy]);
    jest.spyOn(WeakRef.prototype, 'deref').mockReturnValue(undefined);
    expect(() =>
      manager.handle_reconfigureReply(reply(configuration(3.5)))
    ).not.toThrow();
    expect(proxy.edit_value.value_).toBe(3.5);
  });

  it('consumes an acknowledged key after its edit was declined', () => {
    proxy.edit_value = 3.5;
    manager.expect_properties(device, [proxy]);
    proxy.edit_value = undefined;
    expect(() =>
      manager.handle_reconfigureReply(reply(configuration(3.5)))
    ).not.toThrow();
    proxy.edit_value = 6.25;
    manager.handle_reconfigureReply(reply(configuration(3.5)));
    expect(proxy.edit_value.value_).toBe(6.25);
  });

  it('clears a successful submitted edit without notifying subscribers', () => {
    proxy.edit_value = 3.5;
    manager.expect_properties(device, [proxy]);
    const onEdit = jest.fn();
    proxy.edit_update(onEdit);
    manager.handle_reconfigureReply(reply(configuration(3.5)));
    expect(proxy.edit_value).toBeUndefined();
    expect(proxy.value).toBe(1.25);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it.each([6.25, 3.5])(
    'clears the current edit %p at an acknowledged key',
    (value) => {
      proxy.edit_value = 3.5;
      manager.expect_properties(device, [proxy]);
      proxy.edit_value = value;
      manager.handle_reconfigureReply(reply(configuration(3.5)));
      expect(proxy.edit_value).toBeUndefined();
    }
  );

  it('acknowledges property keys without comparing their submitted values', () => {
    device.binding.value!.set('position', new DoubleBinding());
    const position = new PropertyProxy(device, 'position');
    proxy.edit_value = 3.5;
    position.edit_value = 9;
    manager.expect_properties(device, [proxy, position]);
    manager.handle_reconfigureReply(
      reply(new Hash('other', new DoubleValue(6.25)))
    );
    manager.handle_reconfigureReply(reply(configuration(6.25), true, 'OTHER'));
    expect(proxy.edit_value.value_).toBe(3.5);
    manager.handle_reconfigureReply(
      reply(new Hash('speed', new FloatValue(6.25)))
    );
    expect(proxy.edit_value).toBeUndefined();
    expect(position.edit_value.value_).toBe(9);
    proxy.edit_value = 7;
    manager.handle_reconfigureReply(reply(configuration(3.5)));
    expect(proxy.edit_value.value_).toBe(7);
    manager.handle_reconfigureReply(
      reply(new Hash('position', new DoubleValue(9)))
    );
    expect(position.edit_value).toBeUndefined();
  });

  it.each([true, false])(
    'acknowledges a repeated submitted key once, success=%p',
    (success) => {
      proxy.edit_value = 3.5;
      manager.expect_properties(device, [proxy]);
      proxy.edit_value = 6.25;
      manager.expect_properties(device, [proxy]);
      manager.handle_reconfigureReply(reply(configuration(3.5), success));
      if (success) {
        expect(proxy.edit_value).toBeUndefined();
      } else {
        expect(proxy.edit_value.value_).toBe(6.25);
      }
      proxy.edit_value = 7;
      manager.handle_reconfigureReply(reply(configuration(6.25)));
      expect(proxy.edit_value.value_).toBe(7);
    }
  );

  it('retains failed edits, reports the reason, and releases tracking', () => {
    proxy.edit_value = 3.5;
    manager.expect_properties(device, [proxy]);
    manager.handle_reconfigureReply(reply(configuration(3.5), false));
    expect(proxy.edit_value.value_).toBe(3.5);
    expect(showMessageBox).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'error',
        msg: 'Denied ',
        details: 'State changed',
      })
    );
    manager.handle_reconfigureReply(reply(configuration(3.5)));
    expect(proxy.edit_value.value_).toBe(3.5);
  });

  it('reports a failure with only the legacy reason field', () => {
    proxy.edit_value = 3.5;
    manager.expect_properties(device, [proxy]);
    const failure = new Hash(
      'success',
      false,
      'reason',
      'Legacy failure',
      'input',
      new Hash('deviceId', 'DEVICE', 'configuration', configuration(3.5))
    );
    expect(() => manager.handle_reconfigureReply(failure)).not.toThrow();
    expect(showMessageBox).toHaveBeenCalledWith(
      expect.objectContaining({ msg: 'Legacy failure' })
    );
    expect(proxy.edit_value.value_).toBe(3.5);
  });

  it('clears matching duplicate proxies and releases references at disconnect', () => {
    const duplicate = new PropertyProxy(device, 'speed');
    proxy.edit_value = 3.5;
    duplicate.edit_value = 3.5;
    manager.expect_properties(device, [proxy, duplicate]);
    manager.handle_reconfigureReply(reply(configuration(3.5)));
    expect(duplicate.edit_value).toBeUndefined();
    proxy.edit_value = 3.5;
    manager.expect_properties(device, [proxy]);
    network.onConnectionChanged!(false);
    manager.handle_reconfigureReply(reply(configuration(3.5)));
    expect(proxy.edit_value.value_).toBe(3.5);
  });
});
