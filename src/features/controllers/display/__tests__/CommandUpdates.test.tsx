import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import {
  DisplayCommandModel,
  DisplayIconCommandModel,
} from '@/karabo/common/api';
import {
  AccessLevel,
  AccessMode,
  Hash,
  NodeType,
  Schema,
} from '@/karabo/data/api';
import { Network } from '@/lib/singletons/Network';
import { getNetwork } from '@/lib/singletons/api';
import { SystemTopology } from '@/lib/topology/Topology';
import { SingletonContext } from '@/testing';
import { useGlobalStore } from '@/store/api';
import { useController } from '../../useController';
import { useProxies } from '../../useProxies';
import DisplayCommand from '../DisplayCommand';
import DisplayIconCommand from '../DisplayIconCommand';

jest.mock('@/assets/icons', () => ({
  __esModule: true,
  default: { mediaStart: '/start.svg', imageMissing: '/missing.svg' },
}));

function commandSchema({
  allowedStates = ['STOPPED'],
  requiredAccessLevel = AccessLevel.OPERATOR,
  displayedName = 'Start',
  commandType = 'slot',
  includeState = true,
}: {
  allowedStates?: string[];
  requiredAccessLevel?: AccessLevel;
  displayedName?: string;
  commandType?: 'slot' | 'string' | 'missing';
  includeState?: boolean;
} = {}) {
  const hash = new Hash('description', '');
  hash.setAttributes('description', {
    nodeType: NodeType.Leaf,
    valueType: 'STRING',
  });
  if (includeState) {
    hash.set('state', '');
    hash.setAttributes('state', {
      nodeType: NodeType.Leaf,
      valueType: 'STRING',
      accessMode: AccessMode.READONLY,
    });
  }
  if (commandType !== 'missing') {
    hash.set('start', commandType === 'slot' ? new Hash() : '');
    hash.setAttributes('start', {
      nodeType: commandType === 'slot' ? NodeType.Node : NodeType.Leaf,
      ...(commandType === 'slot'
        ? { displayType: 'Slot' }
        : { valueType: 'STRING' }),
      allowedStates,
      requiredAccessLevel,
      displayedName,
    });
  }
  return new Schema('CommandDevice', hash);
}

function Widget({
  variant,
  keys = ['DEV.start'],
}: {
  variant: 'text' | 'icon';
  keys?: string[];
}) {
  const proxies = useProxies(keys);
  const ctx = useController(proxies);
  return variant === 'text' ? (
    <DisplayCommand model={new DisplayCommandModel()} ctx={ctx} />
  ) : (
    <DisplayIconCommand model={new DisplayIconCommandModel()} ctx={ctx} />
  );
}

async function withDevice(
  test: (
    device: ReturnType<SystemTopology['getDevice']>,
    execute: jest.SpyInstance,
    topology: SystemTopology
  ) => void
) {
  const topology = new SystemTopology();
  topology.initialize(new Hash('device.DEV', new Hash()));
  await SingletonContext.run({ topology, network: new Network() }, () => {
    jest.spyOn(getNetwork(), 'sendHash').mockImplementation(() => {});
    const execute = jest.spyOn(getNetwork(), 'onExecute');
    useGlobalStore.getState().setLoggedIn({
      loggedUser: 'operator',
      accessLevel: AccessLevel.OPERATOR,
      isReadOnly: false,
      guiServerHost: 'localhost',
      guiServerPort: 44444,
      guiServerTopic: '',
      guiServerVersion: '',
      sessionStartEpoc: 0,
    });
    try {
      test(topology.getDevice('DEV'), execute, topology);
    } finally {
      cleanup();
    }
  });
}

describe.each(['text', 'icon'] as const)(
  '%s command update subscriptions',
  (variant) => {
    afterEach(() => {
      jest.restoreAllMocks();
      useGlobalStore.getState().reset();
    });

    it('tracks full and partial configurations and sends only while the current state allows execution', async () => {
      await withDevice((device, execute) => {
        const { unmount } = render(<Widget variant={variant} />);
        expect(screen.getByRole('button')).toBeDisabled();
        act(() =>
          device.handleDeviceConfiguration(new Hash('state', 'STOPPED'))
        );
        expect(screen.getByRole('button')).toBeDisabled();
        act(() => device.handleDeviceSchema(commandSchema()));
        expect(
          screen.getByRole('button', { name: 'Command: Start' })
        ).toBeDisabled();
        act(() =>
          device.handleDeviceConfiguration(
            new Hash('state', 'STOPPED', 'description', 'ready')
          )
        );
        const button = screen.getByRole('button');
        expect(button).toBeEnabled();
        fireEvent.click(button);
        expect(execute).toHaveBeenCalledTimes(1);
        expect(execute).toHaveBeenLastCalledWith('DEV', 'start', false);
        for (const state of ['STARTED', '']) {
          act(() => device.handleDeviceConfiguration(new Hash('state', state)));
          expect(button).toBeDisabled();
          act(() =>
            device.handleDeviceConfiguration(
              new Hash('description', 'partial update')
            )
          );
          expect(button).toBeDisabled();
          fireEvent.click(button);
          expect(execute).toHaveBeenCalledTimes(1);
        }
        act(() =>
          device.handleDeviceConfiguration(new Hash('state', 'STOPPED'))
        );
        expect(button).toBeEnabled();
        act(() =>
          device.handleDeviceConfiguration(
            new Hash('description', 'still ready')
          )
        );
        expect(button).toBeEnabled();
        fireEvent.click(button);
        expect(execute).toHaveBeenCalledTimes(2);
        unmount();
      });
    });

    it('replaces schema state/access rules and recovers after commands or state bindings disappear', async () => {
      await withDevice((device, execute) => {
        const { unmount } = render(<Widget variant={variant} />);
        act(() => device.handleDeviceSchema(commandSchema()));
        act(() =>
          device.handleDeviceConfiguration(new Hash('state', 'STOPPED'))
        );
        const oldState = device.getBinding('state')!;
        expect(screen.getByRole('button')).toBeEnabled();
        fireEvent.click(screen.getByRole('button'));
        expect(execute).toHaveBeenCalledTimes(1);
        act(() =>
          device.handleDeviceSchema(
            commandSchema({
              allowedStates: ['STARTED'],
              requiredAccessLevel: AccessLevel.EXPERT,
              displayedName: 'Launch',
            })
          )
        );
        const button = screen.getByRole('button', { name: 'Command: Launch' });
        expect(button).toBeDisabled();
        act(() =>
          device.handleDeviceConfiguration(new Hash('state', 'STOPPED'))
        );
        act(() =>
          useGlobalStore.getState().updateAccessLevel(AccessLevel.EXPERT)
        );
        expect(button).toBeDisabled();
        act(() =>
          device.handleDeviceConfiguration(new Hash('state', 'STARTED'))
        );
        expect(button).toBeEnabled();
        act(() => oldState.setValue('STOPPED', undefined));
        expect(button).toBeEnabled();
        act(() =>
          useGlobalStore.getState().updateAccessLevel(AccessLevel.OPERATOR)
        );
        expect(button).toBeDisabled();
        fireEvent.click(button);
        expect(execute).toHaveBeenCalledTimes(1);
        act(() =>
          useGlobalStore.getState().updateAccessLevel(AccessLevel.EXPERT)
        );
        fireEvent.click(button);
        expect(execute).toHaveBeenCalledTimes(2);

        for (const commandType of ['missing', 'string'] as const) {
          act(() => device.handleDeviceSchema(commandSchema({ commandType })));
          act(() =>
            device.handleDeviceConfiguration(new Hash('state', 'STOPPED'))
          );
          expect(button).toBeDisabled();
          fireEvent.click(button);
          expect(execute).toHaveBeenCalledTimes(2);
        }
        act(() => device.handleDeviceSchema(commandSchema()));
        expect(button).toBeDisabled();
        act(() =>
          device.handleDeviceConfiguration(
            new Hash('description', 'state not received yet')
          )
        );
        expect(button).toBeDisabled();
        act(() =>
          device.handleDeviceConfiguration(new Hash('state', 'STOPPED'))
        );
        expect(button).toBeEnabled();
        fireEvent.click(button);
        expect(execute).toHaveBeenCalledTimes(3);
        act(() =>
          device.handleDeviceSchema(
            commandSchema({ includeState: false, allowedStates: [] })
          )
        );
        act(() =>
          device.handleDeviceConfiguration(new Hash('state', 'STOPPED'))
        );
        expect(button).toBeDisabled();
        fireEvent.click(button);
        expect(execute).toHaveBeenCalledTimes(3);
        act(() => device.handleDeviceSchema(commandSchema()));
        expect(button).toBeDisabled();
        act(() =>
          device.handleDeviceConfiguration(new Hash('state', 'STOPPED'))
        );
        expect(button).toBeEnabled();
        fireEvent.click(button);
        expect(execute).toHaveBeenCalledTimes(4);
        unmount();
      });
    });

    it('updates execution permission when session access changes', async () => {
      await withDevice((device, execute) => {
        const { unmount } = render(<Widget variant={variant} />);
        act(() =>
          device.handleDeviceSchema(
            commandSchema({ requiredAccessLevel: AccessLevel.EXPERT })
          )
        );
        act(() =>
          device.handleDeviceConfiguration(new Hash('state', 'STOPPED'))
        );
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
        act(() =>
          useGlobalStore.getState().updateAccessLevel(AccessLevel.EXPERT)
        );
        expect(button).toBeEnabled();
        fireEvent.click(button);
        expect(execute).toHaveBeenCalledTimes(1);
        for (const level of [AccessLevel.OPERATOR, AccessLevel.OBSERVER]) {
          act(() => useGlobalStore.getState().updateAccessLevel(level));
          expect(button).toBeDisabled();
          fireEvent.click(button);
          expect(execute).toHaveBeenCalledTimes(1);
        }
        act(() =>
          useGlobalStore.getState().updateAccessLevel(AccessLevel.EXPERT)
        );
        expect(button).toBeEnabled();
        fireEvent.click(button);
        expect(execute).toHaveBeenCalledTimes(2);
        act(() => useGlobalStore.getState().setSessionExpired());
        expect(button).toBeDisabled();
        fireEvent.click(button);
        expect(execute).toHaveBeenCalledTimes(2);
        unmount();
      });
    });

    test.each(['configuration', 'schema'] as const)(
      'rechecks a %s update when clicked before React applies the subscription rerender',
      async (update) => {
        await withDevice((device, execute) => {
          const { unmount } = render(<Widget variant={variant} />);
          act(() => device.handleDeviceSchema(commandSchema()));
          act(() =>
            device.handleDeviceConfiguration(new Hash('state', 'STOPPED'))
          );
          const button = screen.getByRole('button');
          expect(button).toBeEnabled();
          act(() => {
            if (update === 'configuration') {
              device.handleDeviceConfiguration(new Hash('state', 'STARTED'));
            } else {
              device.handleDeviceSchema(
                commandSchema({ allowedStates: ['STARTED'] })
              );
              device.handleDeviceConfiguration(new Hash('state', 'STOPPED'));
            }
            // The DOM still has the enabled button; execute must use live bindings.
            expect(button).toBeEnabled();
            fireEvent.click(button);
          });
          expect(execute).not.toHaveBeenCalled();
          expect(button).toBeDisabled();
          unmount();
        });
      }
    );
  }
);

describe('icon command primary controller proxy', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    useGlobalStore.getState().reset();
  });

  it('keeps the primary command after secondary device updates and follows controller key changes', async () => {
    await withDevice((device, execute, topology) => {
      const secondary = topology.getDevice('OTHER');
      secondary.setOnlineFlag(true);
      const { rerender, unmount } = render(
        <Widget variant="icon" keys={['DEV.start', 'OTHER.start']} />
      );
      act(() => {
        device.handleDeviceSchema(commandSchema());
        secondary.handleDeviceSchema(commandSchema());
        device.handleDeviceConfiguration(new Hash('state', 'STARTED'));
        secondary.handleDeviceConfiguration(new Hash('state', 'STOPPED'));
      });
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(execute).not.toHaveBeenCalled();
      act(() =>
        secondary.handleDeviceConfiguration(new Hash('state', 'STOPPED'))
      );
      expect(button).toBeDisabled();
      act(() => device.handleDeviceConfiguration(new Hash('state', 'STOPPED')));
      expect(button).toBeEnabled();
      fireEvent.click(button);
      expect(execute).toHaveBeenLastCalledWith('DEV', 'start', false);
      act(() => device.setOnlineFlag(false));
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(execute).toHaveBeenCalledTimes(1);
      rerender(<Widget variant="icon" keys={['OTHER.start', 'DEV.start']} />);
      expect(button).toBeDisabled();
      act(() => secondary.handleDeviceSchema(commandSchema()));
      expect(button).toBeDisabled();
      act(() =>
        secondary.handleDeviceConfiguration(new Hash('state', 'STOPPED'))
      );
      expect(button).toBeEnabled();
      fireEvent.click(button);
      expect(execute).toHaveBeenCalledTimes(2);
      expect(execute).toHaveBeenLastCalledWith('OTHER', 'start', false);
      act(() => device.handleDeviceConfiguration(new Hash('state', 'STARTED')));
      expect(button).toBeEnabled();
      act(() =>
        secondary.handleDeviceConfiguration(new Hash('state', 'STARTED'))
      );
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(execute).toHaveBeenCalledTimes(2);
      unmount();
    });
  });
});
