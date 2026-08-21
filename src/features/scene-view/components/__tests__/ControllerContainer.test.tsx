import React from 'react';
import { render, screen } from '@testing-library/react';
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
      expect.objectContaining({ model, ctx })
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
});
