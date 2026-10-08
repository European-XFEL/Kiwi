import { Hash, HashAttributes } from '@/karabo/data/api';
import { SingletonContext } from '@/testing';
import { getNetwork } from '@/lib/singletons/api';
import { Network } from '@/lib/singletons/Network';
import { SystemTopology } from '@/lib/topology/Topology';
import { DeviceProxy, PropertyProxy, StringBinding } from '../api';
import { SlotBinding } from '../BaseBinding';

describe('PropertyProxy execution', () => {
  let context: SingletonContext;
  let topology: SystemTopology;
  let root: DeviceProxy;
  let proxy: PropertyProxy;
  let sendHash: jest.SpyInstance;

  beforeEach(() => {
    topology = new SystemTopology();
    context = new SingletonContext({ topology, network: new Network() });
    sendHash = jest
      .spyOn(getNetwork(), 'sendHash')
      .mockImplementation(() => {});
    root = new DeviceProxy('DEV');
    root.binding.value!.set('state', new StringBinding({ value: 'STOPPED' }));
    root.binding.value!.set(
      'start',
      new SlotBinding({
        attributes: new HashAttributes({ allowedStates: ['STOPPED'] }),
      })
    );
    proxy = new PropertyProxy(root, 'start');
  });

  afterEach(() => {
    proxy.dispose();
    jest.restoreAllMocks();
    context.restore();
  });

  it('executes allowed slots with a reply and ordinary timeout', () => {
    proxy.execute();
    expect(sendHash).toHaveBeenCalledTimes(1);
    expect(sendHash).toHaveBeenCalledWith(
      new Hash(
        'type',
        'execute',
        'deviceId',
        'DEV',
        'command',
        'start',
        'reply',
        true,
        'timeout',
        5
      )
    );
  });

  test.each(['STARTED', '', undefined])('rejects current state %s', (state) => {
    if (state === undefined) {
      root.binding.value!.set('state', undefined);
    } else {
      root.getBinding('state')!.setValue(state, undefined);
    }
    proxy.execute();
    expect(sendHash).not.toHaveBeenCalled();
  });

  test.each([new StringBinding(), undefined])(
    'rejects replacement non-slot binding %s',
    (binding) => {
      if (binding) {
        root.binding.value!.set('start', binding);
      } else {
        root.binding.value!.set('start', undefined);
      }
      root.schema_update.fire();
      proxy.execute();
      expect(sendHash).not.toHaveBeenCalled();
    }
  );

  it('rechecks a replacement slot with different allowed states', () => {
    root.binding.value!.set(
      'start',
      new SlotBinding({
        attributes: new HashAttributes({ allowedStates: ['STARTED'] }),
      })
    );
    root.schema_update.fire();
    proxy.execute();
    expect(sendHash).not.toHaveBeenCalled();
  });

  it('uses the current macro classification on every execution', () => {
    expect(topology.isMacro('DEV')).toBe(false);
    topology.initialize(new Hash());
    topology.updateTopology(
      new Hash(
        'changes',
        new Hash(
          'gone',
          new Hash(),
          'new',
          new Hash('macro', new Hash('DEV', new Hash())),
          'update',
          new Hash()
        )
      )
    );
    expect(topology.isMacro('DEV')).toBe(true);
    proxy.execute();
    expect(sendHash).toHaveBeenLastCalledWith(
      new Hash(
        'type',
        'execute',
        'deviceId',
        'DEV',
        'command',
        'start',
        'reply',
        true
      )
    );
    topology.updateTopology(
      new Hash(
        'changes',
        new Hash(
          'gone',
          new Hash('macro', new Hash('DEV', new Hash())),
          'new',
          new Hash(),
          'update',
          new Hash()
        )
      )
    );
    expect(topology.isMacro('DEV')).toBe(false);
    proxy.execute();
    expect(sendHash).toHaveBeenLastCalledWith(
      new Hash(
        'type',
        'execute',
        'deviceId',
        'DEV',
        'command',
        'start',
        'reply',
        true,
        'timeout',
        5
      )
    );
    topology.clear();
    expect(topology.isMacro('DEV')).toBe(false);
  });
});
