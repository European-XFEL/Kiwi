import {
  AccessLevel,
  AccessMode,
  Hash,
  HashAttributes,
} from '@/karabo/data/api';
import { SlotBinding, StringBinding } from '../BaseBinding';
import { DeviceProxy } from '../DeviceProxy';
import { PropertyProxy } from '../PropertyProxy';
import { Configurable, SlotElement, StringElement } from '@/testing';

function command(
  state: string | undefined = 'STOPPED',
  allowedStates = ['STOPPED']
) {
  const root = new DeviceProxy('DEV');
  if (state !== undefined) {
    root.binding.value!.set('state', new StringBinding({ value: state }));
  }
  const binding = new SlotBinding({
    attributes: new HashAttributes({ allowedStates }),
  });
  binding.requiredAccessLevel = AccessLevel.OPERATOR;
  root.binding.value!.set('start', binding);
  return new PropertyProxy(root, 'start');
}

describe('PropertyProxy.isExecutable', () => {
  it('rechecks full and partial configuration updates on the same proxy', () => {
    const proxy = command();
    expect(proxy.isExecutable(AccessLevel.OPERATOR)).toBe(true);
    proxy.root.handleDeviceConfiguration(new Hash('state', 'STARTED'));
    expect(proxy.isExecutable(AccessLevel.OPERATOR)).toBe(false);
    proxy.root.handleDeviceConfiguration(new Hash('unknown', 'ignored'));
    expect(proxy.isExecutable(AccessLevel.OPERATOR)).toBe(false);
    proxy.root.handleDeviceConfiguration(new Hash('state', ''));
    expect(proxy.isExecutable(AccessLevel.EXPERT)).toBe(false);
    proxy.root.handleDeviceConfiguration(new Hash('state', 'STOPPED'));
    expect(proxy.isExecutable(AccessLevel.OPERATOR)).toBe(true);
    proxy.dispose();
  });

  it('uses replacement schema rules and ignores the old state binding', () => {
    class ExpertCommands extends Configurable {
      static state = new StringElement({ accessMode: AccessMode.READONLY });
      static start = new SlotElement({
        allowedStates: ['STARTED'],
        requiredAccessLevel: AccessLevel.EXPERT,
      });
    }
    const proxy = command();
    const oldState = proxy.root.getBinding('state')!;
    const oldSlot = proxy.binding!;
    proxy.root.handleDeviceSchema(ExpertCommands.getClassSchema());
    expect(proxy.isExecutable(AccessLevel.EXPERT)).toBe(false);
    proxy.root.handleDeviceConfiguration(new Hash('state', 'STOPPED'));
    expect(proxy.isExecutable(AccessLevel.EXPERT)).toBe(false);
    proxy.root.handleDeviceConfiguration(new Hash('state', 'STARTED'));
    expect(proxy.isExecutable(AccessLevel.OPERATOR)).toBe(false);
    expect(proxy.isExecutable(AccessLevel.EXPERT)).toBe(true);
    oldState.setValue('STOPPED', undefined);
    oldSlot.requiredAccessLevel = AccessLevel.OBSERVER;
    expect(proxy.isExecutable(AccessLevel.OPERATOR)).toBe(false);
    expect(proxy.isExecutable(AccessLevel.EXPERT)).toBe(true);
    proxy.dispose();
  });
});
