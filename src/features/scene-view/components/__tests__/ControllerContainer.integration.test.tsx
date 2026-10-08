import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  BindingRoot,
  BoolBinding,
  DoubleBinding,
  PropertyProxy,
  ProxyStatus,
} from '@/lib/binding/api';
import { AccessMode } from '@/karabo/data/enums';
import {
  DisplayColorBoolModel,
  DisplayErrorBoolModel,
  DoubleLineEditModel,
} from '@/karabo/common/api';
import DisplayColorBool from '@/features/controllers/display/DisplayColorBool';
import DisplayErrorBool from '@/features/controllers/display/DisplayErrorBool';
import DoubleLineEdit from '@/features/controllers/editable/DoubleLineEdit';
import type { ControllerContainerContext } from '@/features/controllers/useController';
import type { RendererProps } from '../../renderRegistry';
import { createMockSystemTopology, SingletonContext } from '@/testing';
import { SceneControllerRegistry } from '@/features/scenepanel/SceneControllerRegistry';
import SceneToolBar from '@/features/scenepanel/components/SceneToolBar';
import { SceneControllerRegistryProvider } from '../../contexts/SceneControllerRegistryContext';

const mockUseContainer = jest.fn();
const mockOverlaySpy = jest.fn();

jest.mock('@/features/controllers/api', () => ({
  bootstrapControllerRenderers: jest.fn(),
  getModelKeys: jest.fn(() => ''),
  useContainer: () => mockUseContainer(),
  useController: jest.requireActual<
    typeof import('@/features/controllers/useController')
  >('@/features/controllers/useController').useController,
  useProxies: jest.requireActual<
    typeof import('@/features/controllers/useProxies')
  >('@/features/controllers/useProxies').useProxies,
}));

jest.mock('@/features/scene-view/components/widgets/ControllerOverlay', () => {
  const mockReactActual = jest.requireActual<typeof React>('react');

  return {
    ControllerOverlay: ({ proxies, children }: any) => {
      mockOverlaySpy({ proxies });
      return mockReactActual.createElement(
        'div',
        { 'data-testid': 'controller-overlay' },
        children
      );
    },
  };
});

import { ControllerContainer } from '../widgets/ControllerContainer';

const makeTopology = createMockSystemTopology;

const withEditableControllers = async (
  test: (fixture: {
    ctx: ControllerContainerContext;
    otherCtx: ControllerContainerContext;
    input: HTMLInputElement;
    otherInput: HTMLInputElement;
    layout: HTMLElement;
    otherLayout: HTMLElement;
    registry: SceneControllerRegistry;
    applyButton: HTMLElement;
    declineButton: HTMLElement;
  }) => void,
  onKeyDown?: (
    event: React.KeyboardEvent<HTMLDivElement>,
    ctx: ControllerContainerContext
  ) => void
) => {
  const topology = makeTopology();
  const registry = new SceneControllerRegistry();
  const device = topology.getDevice('DEVICE_A');
  const binding = new BindingRoot();
  for (const [path, value] of [
    ['speed', 1.25],
    ['position', 8],
    ['temperature', 2.5],
  ] as const) {
    const propertyBinding = new DoubleBinding({ value });
    propertyBinding.accessMode = AccessMode.RECONFIGURABLE;
    binding.value!.set(path, propertyBinding);
  }
  device.binding = binding;
  device.status = ProxyStatus.MONITORING;
  const model = new DoubleLineEditModel();
  model.keys = ['DEVICE_A.speed', 'DEVICE_A.position'];
  const otherModel = new DoubleLineEditModel();
  otherModel.keys = ['DEVICE_A.temperature'];
  const contexts = new Map<string, ControllerContainerContext>();
  const Renderer = ({ model, ctx, objectId }: RendererProps) => {
    const context = ctx as ControllerContainerContext | undefined;
    if (objectId && context) contexts.set(objectId, context);
    const controller = (
      <DoubleLineEdit model={model as DoubleLineEditModel} ctx={context} />
    );
    return onKeyDown && context ? (
      <div onKeyDown={(event) => onKeyDown(event, context)}>{controller}</div>
    ) : (
      controller
    );
  };

  await SingletonContext.run({ topology }, async () => {
    const { unmount } = render(
      <SceneControllerRegistryProvider registry={registry}>
        <SceneToolBar
          width={800}
          height={600}
          scale={1}
          fitMode="fit-page"
          onFitModeChange={jest.fn()}
          onApplyAll={() => registry.applyAll()}
          onDeclineAll={() => registry.declineAll()}
        />
        <ControllerContainer
          width={180}
          height={40}
          model={model}
          objectId="edit"
          Renderer={Renderer}
        />
        <ControllerContainer
          width={180}
          height={40}
          model={otherModel}
          objectId="other"
          Renderer={Renderer}
        />
      </SceneControllerRegistryProvider>
    );
    try {
      await waitFor(() =>
        expect(
          screen.getAllByTestId('editable-double-line-edit')[0]
        ).toBeEnabled()
      );
      const inputs = screen.getAllByTestId(
        'editable-double-line-edit'
      ) as HTMLInputElement[];
      test({
        ctx: contexts.get('edit')!,
        otherCtx: contexts.get('other')!,
        input: inputs[0],
        otherInput: inputs[1],
        layout: screen.getByTestId('controller-edit'),
        otherLayout: screen.getByTestId('controller-other'),
        registry,
        applyButton: screen.getByLabelText('Apply all changes'),
        declineButton: screen.getByLabelText('Decline all changes'),
      });
    } finally {
      unmount();
    }
  });
};

describe('ControllerContainer integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseContainer.mockReturnValue({
      containerStyle: { pointerEvents: 'auto' },
      contentsStyle: { display: 'block' },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['color', DisplayColorBool, DisplayColorBoolModel],
    ['error', DisplayErrorBool, DisplayErrorBoolModel],
  ] as const)(
    'updates the %s boolean indicator through the proxy lifecycle',
    async (kind, Widget, Model) => {
      const topology = makeTopology();
      const device = topology.getDevice('DEVICE_A');
      device.binding = new BindingRoot();
      const binding = new BoolBinding();
      device.binding.value!.set('enabled', binding);
      device.status = ProxyStatus.MONITORING;
      const model = new Model();
      model.keys = ['DEVICE_A.enabled'];
      const Renderer = ({ model, ctx }: RendererProps) => (
        <Widget
          model={model as DisplayColorBoolModel}
          ctx={ctx as ControllerContainerContext}
        />
      );

      await SingletonContext.run({ topology }, async () => {
        const { unmount } = render(
          <ControllerContainer
            width={120}
            height={40}
            model={model}
            objectId="bool"
            Renderer={Renderer}
          />
        );
        const readIcon = () =>
          screen
            .getByTestId(`display-${kind}-bool`)
            .querySelector('img')
            ?.getAttribute('src');
        const passive =
          kind === 'color' ? 'switch-bool-passive-icon' : 'error-bool-icon';
        const active =
          kind === 'color' ? 'switch-bool-active-icon' : 'ok-bool-icon';
        expect(readIcon()).toBe('unknown-bool-icon');
        act(() => binding.setValue(true, undefined));
        await waitFor(() => expect(readIcon()).toBe(active));
        act(() => binding.setValue(false, undefined));
        await waitFor(() => expect(readIcon()).toBe(passive));

        const replacement = new BoolBinding();
        replacement.setValue(true, undefined);
        act(() => {
          device.binding!.value!.set('enabled', replacement);
          device.schema_update.fire();
        });
        await waitFor(() => expect(readIcon()).toBe(active));
        act(() => {
          device.binding!.value!.set('enabled', new BoolBinding());
          device.schema_update.fire();
        });
        await waitFor(() => expect(readIcon()).toBe('unknown-bool-icon'));
        unmount();
      });
    }
  );

  it('applies and declines all mounted editable controllers from the toolbar', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    await withEditableControllers(
      ({
        ctx,
        otherCtx,
        input,
        otherInput,
        layout,
        otherLayout,
        applyButton,
        declineButton,
      }) => {
        act(() => input.focus());
        fireEvent.change(input, { target: { value: '3.5' } });
        act(() => otherInput.focus());
        fireEvent.change(otherInput, { target: { value: '9' } });
        act(() => {
          ctx.proxies[1].edit_value = 10;
        });
        log.mockClear();

        fireEvent.click(applyButton);
        expect(log).toHaveBeenCalledTimes(3);
        expect(log).toHaveBeenCalledWith(
          'DEVICE_A.speed',
          ctx.proxy!.edit_value
        );
        expect(log).toHaveBeenCalledWith(
          'DEVICE_A.position',
          ctx.proxies[1].edit_value
        );
        expect(log).toHaveBeenCalledWith(
          'DEVICE_A.temperature',
          otherCtx.proxy!.edit_value
        );
        expect(input).toHaveValue('3.5');
        expect(otherInput).toHaveValue('9');
        expect(layout).toHaveStyle({
          backgroundColor: 'rgba(0, 170, 255, 0.502)',
        });
        expect(otherLayout).toHaveStyle({
          backgroundColor: 'rgba(0, 170, 255, 0.502)',
        });

        fireEvent.click(declineButton);
        expect(
          [...ctx.proxies, ...otherCtx.proxies].every(
            (proxy) => proxy.edit_value === undefined
          )
        ).toBe(true);
        expect(input).toHaveValue('1.25');
        expect(otherInput).toHaveValue('2.5');
        expect(layout.style.backgroundColor).toBe('transparent');
        expect(otherLayout.style.backgroundColor).toBe('transparent');
      }
    );
  });

  it('runs defaults before additional actions for keyboard and toolbar, including controllers without pending edits', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    await withEditableControllers(
      ({
        ctx,
        otherCtx,
        input,
        otherInput,
        layout,
        otherLayout,
        applyButton,
        declineButton,
      }) => {
        const apply = jest.fn(() => {
          expect(log).toHaveBeenCalledWith(
            'DEVICE_A.speed',
            ctx.proxy!.edit_value
          );
        });
        const decline = jest.fn(() => {
          expect(
            ctx.proxies.every((proxy) => proxy.edit_value === undefined)
          ).toBe(true);
        });
        const otherApply = jest.fn();
        const otherDecline = jest.fn(() => {
          expect(otherCtx.proxy!.edit_value).toBeUndefined();
        });
        const unregister = ctx.editActions!.register({ apply, decline });
        otherCtx.editActions!.register({
          apply: otherApply,
          decline: otherDecline,
        });

        act(() => input.focus());
        fireEvent.change(input, { target: { value: '6.25' } });
        log.mockClear();
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(apply).toHaveBeenCalledTimes(1);
        expect(log).toHaveBeenCalledWith(
          'DEVICE_A.speed',
          ctx.proxy!.edit_value
        );
        fireEvent.keyDown(input, { key: 'Escape' });
        expect(decline).toHaveBeenCalledTimes(1);
        expect(ctx.proxy!.edit_value).toBeUndefined();
        expect(input).toHaveValue('1.25');
        expect(layout.style.backgroundColor).toBe('transparent');

        fireEvent.change(input, { target: { value: '6.25' } });
        fireEvent.click(applyButton);
        expect(apply).toHaveBeenCalledTimes(2);
        expect(otherApply).toHaveBeenCalledTimes(1);
        expect(ctx.proxy!.edit_value.value_).toBe(6.25);
        act(() => otherInput.focus());
        fireEvent.change(otherInput, { target: { value: '9' } });
        fireEvent.click(declineButton);
        expect(decline).toHaveBeenCalledTimes(2);
        expect(otherDecline).toHaveBeenCalledTimes(1);
        expect(input).toHaveValue('1.25');
        expect(layout.style.backgroundColor).toBe('transparent');
        expect(otherCtx.proxy!.edit_value).toBeUndefined();
        expect(otherLayout.style.backgroundColor).toBe('transparent');

        unregister();
        fireEvent.click(declineButton);
        expect(ctx.proxy!.edit_value).toBeUndefined();
        expect(layout.style.backgroundColor).toBe('transparent');
      }
    );
  });

  it.each([
    { key: 'Enter', stopPropagation: false },
    { key: 'Escape', stopPropagation: false },
    { key: 'Enter', stopPropagation: true },
    { key: 'Escape', stopPropagation: true },
  ])(
    'runs the $key default before controller key handlers with stopPropagation=$stopPropagation',
    async ({ key, stopPropagation }) => {
      const log = jest.spyOn(console, 'log').mockImplementation(() => {});
      const onKeyDown = jest.fn(
        (
          event: React.KeyboardEvent<HTMLDivElement>,
          ctx: ControllerContainerContext
        ) => {
          if (event.key !== key) return;
          if (key === 'Enter') {
            expect(ctx.proxy!.edit_value.value_).toBe(3.5);
            expect(log).toHaveBeenCalledWith(
              'DEVICE_A.speed',
              ctx.proxy!.edit_value
            );
          } else {
            expect(ctx.proxy!.edit_value).toBeUndefined();
            expect(log).not.toHaveBeenCalled();
          }
          if (stopPropagation) {
            event.preventDefault();
            event.stopPropagation();
          }
        }
      );

      await withEditableControllers(({ ctx, input, layout }) => {
        act(() => input.focus());
        fireEvent.change(input, { target: { value: '3.5' } });
        log.mockClear();
        fireEvent.keyDown(input, { key });

        expect(onKeyDown).toHaveBeenCalledTimes(1);
        if (key === 'Enter') {
          expect(log).toHaveBeenCalledWith(
            'DEVICE_A.speed',
            ctx.proxy!.edit_value
          );
          expect(ctx.proxy!.edit_value.value_).toBe(3.5);
          expect(input).toHaveValue('3.5');
          expect(layout).toHaveStyle({
            backgroundColor: 'rgba(0, 170, 255, 0.502)',
          });
        } else {
          expect(ctx.proxy!.edit_value).toBeUndefined();
          expect(input).toHaveValue('1.25');
          expect(layout.style.backgroundColor).toBe('transparent');
          expect(log).not.toHaveBeenCalled();
        }
      }, onKeyDown);
    }
  );

  it('stages valid numbers immediately and highlights even an edit equal to the device value', async () => {
    await withEditableControllers(({ ctx, input, layout }) => {
      expect(layout.style.backgroundColor).toBe('transparent');
      act(() => input.focus());
      for (const [text, value] of [
        ['2.5', 2.5],
        ['1.25', 1.25],
        ['0', 0],
        ['-2.5e2', -250],
      ] as const) {
        fireEvent.change(input, { target: { value: text } });
        expect(ctx.proxy!.edit_value.value_).toBe(value);
        expect(ctx.proxy!.value).toBe(1.25);
        expect(input).toHaveValue(text);
        expect(layout).toHaveStyle({
          backgroundColor: 'rgba(0, 170, 255, 0.502)',
        });
      }
    });
  });

  it('handles Enter and Escape for all proxies of the focused controller only', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    await withEditableControllers(
      ({ ctx, otherCtx, input, otherInput, layout, otherLayout }) => {
        act(() => otherInput.focus());
        fireEvent.change(otherInput, { target: { value: '9' } });
        act(() => {
          ctx.proxies[1].edit_value = 10;
          input.focus();
        });
        expect(layout).toHaveStyle({
          backgroundColor: 'rgba(0, 170, 255, 0.502)',
        });
        fireEvent.change(input, { target: { value: '3.5' } });
        log.mockClear();

        fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
        expect(log).not.toHaveBeenCalled();
        fireEvent.keyDown(document.body, { key: 'Enter' });
        expect(log).not.toHaveBeenCalled();
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(log).toHaveBeenCalledTimes(2);
        expect(log).toHaveBeenCalledWith(
          'DEVICE_A.speed',
          ctx.proxy!.edit_value
        );
        expect(log).toHaveBeenCalledWith(
          'DEVICE_A.position',
          ctx.proxies[1].edit_value
        );
        expect(ctx.proxy!.edit_value.value_).toBe(3.5);
        expect(layout).toHaveStyle({
          backgroundColor: 'rgba(0, 170, 255, 0.502)',
        });

        fireEvent.keyDown(input, { key: 'Escape' });
        expect(
          ctx.proxies.every((proxy) => proxy.edit_value === undefined)
        ).toBe(true);
        expect(input).toHaveValue('1.25');
        expect(layout.style.backgroundColor).toBe('transparent');
        expect(otherCtx.proxy!.edit_value.value_).toBe(9);
        expect(otherLayout).toHaveStyle({
          backgroundColor: 'rgba(0, 170, 255, 0.502)',
        });
      }
    );
  });

  it('keeps pending edits across blur and device updates, and restores device text on external clearing', async () => {
    await withEditableControllers(({ ctx, input, otherInput, layout }) => {
      act(() => input.focus());
      fireEvent.change(input, { target: { value: '4.5' } });
      act(() => otherInput.focus());
      expect(input).toHaveValue('4.5');
      act(() => ctx.proxy!.binding!.setValue(7.5, undefined));
      expect(input).toHaveValue('4.5');
      act(() => input.focus());
      act(() => {
        ctx.proxy!.edit_value = undefined;
      });
      expect(input).toHaveValue('7.5');
      expect(layout.style.backgroundColor).toBe('transparent');
    });
  });

  it.each(['', '-', '1e', '12abc', 'Infinity', '0x10'])(
    'clears invalid input %j while retaining its focused draft',
    async (text) => {
      const log = jest.spyOn(console, 'log').mockImplementation(() => {});
      await withEditableControllers(({ ctx, input, layout }) => {
        act(() => input.focus());
        fireEvent.change(input, { target: { value: '3.5' } });
        fireEvent.change(input, { target: { value: text } });
        expect(ctx.proxy!.edit_value).toBeUndefined();
        expect(input).toHaveValue(text);
        expect(layout.style.backgroundColor).toBe('transparent');
        log.mockClear();
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(log).not.toHaveBeenCalled();
        fireEvent.keyDown(input, { key: 'Escape' });
        expect(input).toHaveValue('1.25');
      });
    }
  );

  it('owns proxies, derives controller context, passes ctx to the widget, and drives the overlay from the same proxies list', async () => {
    const topology = makeTopology();
    const disposeSpy = jest.spyOn(PropertyProxy.prototype, 'dispose');
    let lastCtx: any;

    const Renderer = jest.fn(({ ctx }) => {
      lastCtx = ctx;
      const deviceId = ctx.proxy?.root.deviceId ?? '';
      const propertyPath = ctx.proxy?.path ?? '';
      return (
        <div data-testid="renderer">
          {deviceId}:{propertyPath}:{ctx.proxies.length}
        </div>
      );
    });

    const model = {
      keys: ['DEVICE_A.speed', 'DEVICE_B.temperature'],
      parent_component: 'DisplayComponent',
    } as any;

    await SingletonContext.run({ topology }, async () => {
      const { unmount } = render(
        <ControllerContainer
          width={180}
          height={40}
          model={model}
          objectId="scene.0"
          Renderer={Renderer}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('renderer')).toHaveTextContent(
          'DEVICE_A:speed:2'
        );
      });

      expect(topology.getDevice).toHaveBeenCalledWith('DEVICE_A');
      expect(topology.getDevice).toHaveBeenCalledWith('DEVICE_B');
      expect(topology.getDevice('DEVICE_A')?.addMonitor).toHaveBeenCalledTimes(
        1
      );
      expect(topology.getDevice('DEVICE_B')?.addMonitor).toHaveBeenCalledTimes(
        1
      );

      expect(lastCtx.proxy).toBe(lastCtx.proxies[0]);
      expect(lastCtx.proxy.root.deviceId).toBe('DEVICE_A');
      expect(lastCtx.proxy.path).toBe('speed');
      expect(lastCtx.proxies[1].root.deviceId).toBe('DEVICE_B');
      expect(screen.getByTestId('controller-overlay')).toBeInTheDocument();

      const overlayCall = mockOverlaySpy.mock.calls.at(-1)?.[0];
      expect(overlayCall.proxies).toBe(lastCtx.proxies);

      unmount();

      expect(
        topology.getDevice('DEVICE_A')?.stopMonitoring
      ).toHaveBeenCalledTimes(1);
      expect(
        topology.getDevice('DEVICE_B')?.stopMonitoring
      ).toHaveBeenCalledTimes(1);
      expect(disposeSpy).toHaveBeenCalledTimes(2);
    });
  });
});
