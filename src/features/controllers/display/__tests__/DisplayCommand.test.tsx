import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ControllerContainerContext } from '@/features/controllers/useController';
import { DisplayCommandModel } from '@/karabo/common/api';
import { AccessLevel, Hash, HashAttributes } from '@/karabo/data/api';
import {
  DeviceProxy,
  PropertyProxy,
  ProxyStatus,
  StringBinding,
} from '@/lib/binding/api';
import { SlotBinding } from '@/lib/binding/BaseBinding';
import { getNetwork } from '@/lib/singletons/api';
import { createMockSystemTopology, SingletonContext } from '@/testing';
import { useProxies } from '../../useProxies';
import { useController } from '../../useController';
import DisplayCommand from '../DisplayCommand';

function command(
  deviceId: string,
  path: string,
  state = 'STOPPED',
  allowedStates = ['STOPPED']
) {
  const root = new DeviceProxy(deviceId);
  root.status = ProxyStatus.ALIVE;
  root.binding.value!.set('state', new StringBinding({ value: state }));
  const binding = new SlotBinding({
    attributes: new HashAttributes({ allowedStates }),
  });
  binding.displayedName = path;
  binding.requiredAccessLevel = AccessLevel.OPERATOR;
  root.binding.value!.set(path, binding);
  return new PropertyProxy(root, path);
}

function context(proxies: PropertyProxy[]): ControllerContainerContext {
  return {
    proxy: proxies[0],
    proxies,
    userAccessLevel: AccessLevel.OPERATOR,
    setTooltip: jest.fn(),
  };
}

describe('DisplayCommand', () => {
  afterEach(() => jest.restoreAllMocks());

  it('shows the corner arrow only while multiple proxies are configured', () => {
    const first = command('DEV', 'Start');
    const second = command('OTHER', 'Stop');
    second.root.status = ProxyStatus.OFFLINE;
    const ctx = context([first]);
    const model = new DisplayCommandModel();
    const { rerender } = render(<DisplayCommand model={model} ctx={ctx} />);
    expect(
      screen.queryByTestId('command-multiple-indicator')
    ).not.toBeInTheDocument();
    ctx.proxies = [first, second];
    rerender(<DisplayCommand model={model} ctx={ctx} />);
    const indicator = screen.getByTestId('command-multiple-indicator');
    expect(indicator).toHaveAttribute('aria-hidden', 'true');
    expect(indicator.closest('button')).toBe(
      screen.getByRole('button', { name: 'Command: Start' })
    );
    expect(screen.getByRole('button')).toHaveTextContent(/^Start$/);
    first.root.status = ProxyStatus.OFFLINE;
    rerender(<DisplayCommand model={model} ctx={ctx} />);
    expect(
      screen.getByTestId('command-multiple-indicator')
    ).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
    ctx.proxies = [first];
    rerender(<DisplayCommand model={model} ctx={ctx} />);
    expect(
      screen.queryByTestId('command-multiple-indicator')
    ).not.toBeInTheDocument();
    ctx.proxies = [];
    rerender(<DisplayCommand model={model} ctx={ctx} />);
    expect(
      screen.queryByTestId('command-multiple-indicator')
    ).not.toBeInTheDocument();
  });

  it('keeps caption, label, tooltip and execution on the first allowed command', () => {
    const start = command('A', 'Start');
    const stop = command('B', 'Stop', 'STARTED', ['STARTED']);
    const third = command('C', 'Reset');
    const ctx = context([start, stop, third]);
    const model = new DisplayCommandModel();
    const spies = ctx.proxies.map((proxy) =>
      jest.spyOn(proxy, 'execute').mockImplementation(() => {})
    );
    const { rerender, unmount } = render(
      <DisplayCommand model={model} ctx={ctx} />
    );
    expect(
      screen.getByRole('button', { name: 'Command: Start' })
    ).toHaveTextContent(/^Start$/);
    expect(ctx.setTooltip).toHaveBeenLastCalledWith('A.Start');
    start.root.getBinding('state')!.setValue('STARTED', undefined);
    rerender(<DisplayCommand model={model} ctx={ctx} />);
    const button = screen.getByRole('button', { name: 'Command: Stop' });
    expect(button).toBeEnabled();
    expect(button).toHaveTextContent(/^Stop$/);
    expect(ctx.setTooltip).toHaveBeenLastCalledWith('B.Stop');
    fireEvent.click(button);
    expect(spies[0]).not.toHaveBeenCalled();
    expect(spies[1]).toHaveBeenCalledTimes(1);
    expect(spies[2]).not.toHaveBeenCalled();
    stop.root.status = ProxyStatus.OFFLINE;
    rerender(<DisplayCommand model={model} ctx={ctx} />);
    expect(
      screen.getByRole('button', { name: 'Command: Reset' })
    ).toBeEnabled();
    ctx.proxies = [third, start, stop];
    rerender(<DisplayCommand model={model} ctx={ctx} />);
    third.binding!.displayedName = 'Restart';
    third.binding!.requiredAccessLevel = AccessLevel.EXPERT;
    rerender(<DisplayCommand model={model} ctx={ctx} />);
    expect(
      screen.getByRole('button', { name: 'Command: Restart' })
    ).toBeDisabled();
    ctx.userAccessLevel = AccessLevel.EXPERT;
    rerender(<DisplayCommand model={model} ctx={ctx} />);
    expect(
      screen.getByRole('button', { name: 'Command: Restart' })
    ).toBeEnabled();
    ctx.proxies = [start];
    rerender(<DisplayCommand model={model} ctx={ctx} />);
    expect(
      screen.getByRole('button', { name: 'Command: Start' })
    ).toBeDisabled();
    ctx.proxies = [start, third];
    rerender(<DisplayCommand model={model} ctx={ctx} />);
    expect(
      screen.getByRole('button', { name: 'Command: Restart' })
    ).toBeEnabled();
    unmount();
    expect(ctx.setTooltip).toHaveBeenLastCalledWith(undefined);
  });

  test.each([undefined, context([])])('disables empty context %s', (ctx) => {
    render(<DisplayCommand model={new DisplayCommandModel()} ctx={ctx} />);
    expect(
      screen.getByRole('button', { name: 'Command: NO TEXT' })
    ).toBeDisabled();
  });

  test.each(['', undefined])(
    'rejects missing state %s even for an unrestricted slot',
    (state) => {
      const proxy = command('DEV', 'start', 'STOPPED', []);
      if (state === undefined) {
        proxy.root.binding.value!.set('state', undefined);
      } else {
        proxy.root.getBinding('state')!.setValue(state, undefined);
      }
      render(
        <DisplayCommand
          model={new DisplayCommandModel()}
          ctx={context([proxy])}
        />
      );
      expect(
        screen.getByRole('button', { name: 'Command: start' })
      ).toBeDisabled();
    }
  );

  it('refreshes schema captions, falls back to paths and rejects missing or non-slot bindings', () => {
    const proxy = command('DEV', 'start');
    const ctx = context([proxy]);
    const model = new DisplayCommandModel();
    const { rerender } = render(<DisplayCommand model={model} ctx={ctx} />);
    const replacement = new SlotBinding();
    replacement.displayedName = 'Launch';
    proxy.root.binding.value!.set('start', replacement);
    proxy.root.schema_update.fire();
    rerender(<DisplayCommand model={model} ctx={ctx} />);
    expect(
      screen.getByRole('button', { name: 'Command: Launch' })
    ).toBeEnabled();
    replacement.displayedName = '';
    rerender(<DisplayCommand model={model} ctx={ctx} />);
    expect(
      screen.getByRole('button', { name: 'Command: start' })
    ).toBeEnabled();
    proxy.root.binding.value!.set('start', new StringBinding());
    proxy.root.schema_update.fire();
    rerender(<DisplayCommand model={model} ctx={ctx} />);
    expect(screen.getByRole('button')).toBeDisabled();
    proxy.root.binding.value!.set('start', undefined);
    proxy.root.schema_update.fire();
    rerender(<DisplayCommand model={model} ctx={ctx} />);
    expect(
      screen.getByRole('button', { name: 'Command: NO TEXT' })
    ).toBeDisabled();
  });

  it('confirms without changing the caption and applies bold pink only when enabled', () => {
    const proxy = command('DEV', 'start');
    const ctx = context([proxy]);
    const model = new DisplayCommandModel();
    model.requires_confirmation = true;
    model.font_size = 14;
    const execute = jest.spyOn(proxy, 'execute').mockImplementation(() => {});
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    const { rerender } = render(<DisplayCommand model={model} ctx={ctx} />);
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent(/^start$/);
    expect(button).toHaveStyle({
      fontSize: '14pt',
      fontWeight: 'bold',
      color: 'rgb(255, 145, 255)',
    });
    fireEvent.click(button);
    expect(confirm).toHaveBeenCalledWith(
      'Are you sure you want to execute "start"?'
    );
    expect(execute).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fireEvent.click(button);
    expect(execute).toHaveBeenCalledTimes(1);
    ctx.userAccessLevel = AccessLevel.OBSERVER;
    rerender(<DisplayCommand model={model} ctx={ctx} />);
    expect(button).toBeDisabled();
    expect(button.style.color).toBe('');
    expect(button).toHaveClass('text-[#999]');
    model.requires_confirmation = false;
    model.font_weight = 'bold';
    rerender(<DisplayCommand model={model} ctx={ctx} />);
    expect(button).toHaveStyle({ fontWeight: 'bolder', fontSize: '14pt' });
  });

  test.each(['state', 'binding'])(
    'rechecks %s after confirmation before sending',
    (change) => {
      const proxy = command('DEV', 'start');
      const sendHash = jest
        .spyOn(getNetwork(), 'sendHash')
        .mockImplementation(() => {});
      jest.spyOn(window, 'confirm').mockImplementation(() => {
        if (change === 'state') {
          proxy.root.getBinding('state')!.setValue('STARTED', undefined);
        } else {
          proxy.root.binding.value!.set('start', new StringBinding());
          proxy.root.schema_update.fire();
        }
        return true;
      });
      const model = new DisplayCommandModel();
      model.requires_confirmation = true;
      render(<DisplayCommand model={model} ctx={context([proxy])} />);
      fireEvent.click(screen.getByRole('button'));
      expect(sendHash).not.toHaveBeenCalled();
    }
  );

  it('switches commands through live container subscriptions and key changes', async () => {
    const topology = createMockSystemTopology();
    const device = topology.getDevice('DEV');
    const start = command('DEV', 'Start');
    const stop = new SlotBinding({
      attributes: new HashAttributes({ allowedStates: ['STARTED'] }),
    });
    stop.displayedName = 'Stop';
    start.root.binding.value!.set('Stop', stop);
    device.binding = start.root.binding;
    device.status = ProxyStatus.ALIVE;
    const model = new DisplayCommandModel();
    const setTooltip = jest.fn();
    function Widget({ keys }: { keys: string[] }) {
      const proxies = useProxies(keys);
      const ctx = useController(proxies);
      return (
        <DisplayCommand
          model={model}
          ctx={{ ...ctx, userAccessLevel: AccessLevel.EXPERT, setTooltip }}
        />
      );
    }
    await SingletonContext.run({ topology }, () => {
      const { rerender, unmount } = render(
        <Widget keys={['DEV.Start', 'DEV.Stop']} />
      );
      expect(
        screen.getByRole('button', { name: 'Command: Start' })
      ).toBeEnabled();
      act(() => device.handleDeviceConfiguration(new Hash('state', 'STARTED')));
      expect(
        screen.getByRole('button', { name: 'Command: Stop' })
      ).toBeEnabled();
      expect(setTooltip).toHaveBeenLastCalledWith('DEV.Stop');
      act(() => device.setOnlineFlag(false));
      expect(
        screen.getByRole('button', { name: 'Command: Start' })
      ).toBeDisabled();
      act(() => device.setOnlineFlag(true));
      expect(
        screen.getByRole('button', { name: 'Command: Stop' })
      ).toBeEnabled();
      const replacement = new SlotBinding();
      replacement.displayedName = 'Finish';
      act(() => {
        device.binding.value!.set('Stop', replacement);
        device.schema_update.fire();
      });
      expect(
        screen.getByRole('button', { name: 'Command: Finish' })
      ).toBeEnabled();
      rerender(<Widget keys={['DEV.Stop', 'DEV.Start']} />);
      expect(
        screen.getByRole('button', { name: 'Command: Finish' })
      ).toBeEnabled();
      rerender(<Widget keys={['DEV.Start']} />);
      expect(
        screen.getByRole('button', { name: 'Command: Start' })
      ).toBeDisabled();
      rerender(<Widget keys={['DEV.Start', 'DEV.Stop']} />);
      expect(
        screen.getByRole('button', { name: 'Command: Finish' })
      ).toBeEnabled();
      unmount();
      expect(setTooltip).toHaveBeenLastCalledWith(undefined);
    });
  });
});
