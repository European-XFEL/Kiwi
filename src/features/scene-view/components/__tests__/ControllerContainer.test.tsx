import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/api';
import type { ControllerContainerContext } from '@/features/controllers/useController';
import type { RendererProps } from '../../renderRegistry';
import { getModelKeys } from '@/features/controllers/api';
import {
  BaseWidgetObjectData,
  DisplayColorBoolModel,
} from '@/karabo/common/api';
import { AccessLevel, AccessMode } from '@/karabo/data/enums';
import { ProxyStatus } from '@/lib/binding/api';

const mockUseContainer = jest.fn();
const mockUseProxies = jest.fn();
const mockUseController = jest.fn();
const mockOverlaySpy = jest.fn();

jest.mock('@/features/controllers/api', () => ({
  getModelKeys: jest.fn(() => ''),
  useContainer: () => mockUseContainer(),
  useProxies: (keys: string[]) => mockUseProxies(keys),
  useController: (proxies: unknown[]) => mockUseController(proxies),
}));

jest.mock('@/features/scene-view/components/widgets/ControllerOverlay', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    ControllerOverlay: ({ proxies, children }: any) => {
      mockOverlaySpy({ proxies });
      return ReactActual.createElement(
        'div',
        { 'data-testid': 'controller-overlay' },
        children
      );
    },
  };
});

import { ControllerContainer } from '../widgets/ControllerContainer';

const makeControllerContext = () => {
  const proxy = {
    root: { deviceId: 'DEVICE_A', status: ProxyStatus.MONITORING },
    path: 'speed',
    binding: {
      accessMode: AccessMode.RECONFIGURABLE,
      requiredAccessLevel: AccessLevel.OBSERVER,
    },
    value: 42,
  };
  const proxies = [proxy];

  return {
    ctx: {
      proxy,
      proxies,
      userAccessLevel: AccessLevel.OBSERVER,
    },
    proxies,
  };
};

describe('ControllerContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseContainer.mockReturnValue({
      containerStyle: { pointerEvents: 'auto' },
      contentsStyle: { display: 'block' },
    });
  });

  it('renders the renderer with controller ctx and forwards proxies to the overlay', () => {
    const { ctx, proxies } = makeControllerContext();
    const Renderer = jest.fn(({ ctx: rendererCtx }) => (
      <div data-testid="renderer">
        {rendererCtx.proxy.root.deviceId}.{rendererCtx.proxy.path}
      </div>
    ));
    const model = {
      keys: ['DEVICE_A.speed'],
      parent_component: 'EditableApplyLaterComponent',
    } as any;

    mockUseProxies.mockReturnValue(proxies);
    mockUseController.mockReturnValue(ctx);

    render(
      <ControllerContainer
        width={140}
        height={32}
        model={model}
        objectId="scene.0"
        Renderer={Renderer}
      />
    );

    expect(mockUseProxies).toHaveBeenCalledWith(['DEVICE_A.speed']);
    expect(mockUseController).toHaveBeenCalledWith(proxies);
    expect(Renderer).toHaveBeenCalled();
    expect(Renderer.mock.calls[0][0]).toEqual(
      expect.objectContaining({ model, ctx: expect.objectContaining(ctx) })
    );
    expect(screen.getByTestId('renderer')).toHaveTextContent('DEVICE_A.speed');
    expect(mockOverlaySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        proxies,
      })
    );
  });

  it('skips renderer work when the parent rerenders with the same props', () => {
    const { ctx, proxies } = makeControllerContext();
    const Renderer = jest.fn(() => <div data-testid="renderer" />);
    const model = {
      keys: ['DEVICE_A.speed'],
      parent_component: 'DisplayComponent',
    } as any;

    mockUseProxies.mockReturnValue(proxies);
    mockUseController.mockReturnValue(ctx);

    const { rerender } = render(
      <ControllerContainer
        width={140}
        height={32}
        model={model}
        objectId="scene.0"
        Renderer={Renderer}
      />
    );

    expect(Renderer).toHaveBeenCalledTimes(1);

    rerender(
      <ControllerContainer
        width={140}
        height={32}
        model={model}
        objectId="scene.0"
        Renderer={Renderer}
      />
    );

    expect(Renderer).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      parentComponent: 'EditableApplyLaterComponent',
      padding: '1px 2px 1px 2px',
    },
    {
      parentComponent: 'DisplayComponent',
      padding: '0px 1px 1px 0px',
    },
  ])(
    'applies Python-compatible contents margins for $parentComponent',
    ({ parentComponent, padding }) => {
      const { ctx, proxies } = makeControllerContext();
      const Renderer = jest.fn(() => <div data-testid="renderer" />);
      const model = {
        keys: ['DEVICE_A.speed'],
        parent_component: parentComponent,
      } as BaseWidgetObjectData;

      mockUseProxies.mockReturnValue(proxies);
      mockUseController.mockReturnValue(ctx);

      render(
        <ControllerContainer
          width={140}
          height={32}
          model={model}
          objectId="scene.0"
          Renderer={Renderer}
        />
      );

      const controllerLayout = screen.getByTestId('controller-scene.0');

      expect(controllerLayout).toHaveClass('w-full', 'h-full');
      expect(controllerLayout).toHaveStyle({
        boxSizing: 'border-box',
        padding,
      });
    }
  );

  it('attaches the property tooltip trigger to a DOM element', () => {
    const { ctx, proxies } = makeControllerContext();
    const Renderer = jest.fn(() => <div data-testid="renderer" />);
    const model = {
      keys: ['DEVICE_A.speed'],
      parent_component: 'EditableApplyLaterComponent',
    } as any;

    mockUseProxies.mockReturnValue(proxies);
    mockUseController.mockReturnValue(ctx);

    render(
      <ControllerContainer
        width={140}
        height={32}
        model={model}
        objectId="scene.0"
        Renderer={Renderer}
      />
    );

    const tooltipTrigger = screen
      .getByTestId('renderer')
      .closest('[data-slot="tooltip-trigger"]');

    expect(tooltipTrigger).toBeInTheDocument();
    expect(tooltipTrigger).toHaveClass('pointer-events-auto');
  });

  it('shows multiline overrides, keeps the setter stable, and restores the standard tooltip on cleanup', async () => {
    const { ctx, proxies } = makeControllerContext();
    mockUseProxies.mockReturnValue(proxies);
    mockUseController.mockReturnValue(ctx);
    jest.mocked(getModelKeys).mockReturnValue('DEVICE_A.speed');
    const setters: ControllerContainerContext['setTooltip'][] = [];
    const Renderer = ({ ctx }: RendererProps) => {
      const context = ctx as ControllerContainerContext | undefined;
      setters.push(context?.setTooltip);
      const setTooltip = context?.setTooltip;
      React.useEffect(() => {
        setTooltip?.('DEVICE_A.speed\nInverted: False');
        return () => setTooltip?.(undefined);
      }, [setTooltip]);
      return <div data-testid="renderer" />;
    };
    const model = new DisplayColorBoolModel();
    model.keys = ['DEVICE_A.speed'];
    const view = (component: typeof PlainRenderer | typeof Renderer) => (
      <TooltipProvider>
        <ControllerContainer
          width={140}
          height={32}
          model={model}
          objectId="scene.0"
          Renderer={component}
        />
      </TooltipProvider>
    );
    const PlainRenderer = () => <div data-testid="renderer" />;
    const { rerender } = render(view(Renderer));
    fireEvent.focus(
      screen.getByTestId('renderer').closest('[data-slot="tooltip-trigger"]')!
    );
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.textContent).toContain('DEVICE_A.speed\nInverted: False');
    expect(tooltip.querySelector('p')).toHaveStyle({ whiteSpace: 'pre-line' });
    expect(setters[0]).toEqual(expect.any(Function));
    expect(setters.every((setter) => setter === setters[0])).toBe(true);
    rerender(view(PlainRenderer));
    expect(screen.getByRole('tooltip').textContent).toBe('DEVICE_A.speed');
  });
});
