import React from 'react';
import { render, screen } from '@testing-library/react';
import { AccessLevel, AccessMode } from '@/karabo/data/enums';
import { ProxyStatus } from '@/lib/binding/api';

const mockUseContainer = jest.fn();
const mockUseProxies = jest.fn();
const mockUseController = jest.fn();
const mockOverlaySpy = jest.fn();

jest.mock('../../hooks/useContainer', () => ({
  useContainer: () => mockUseContainer(),
}));

jest.mock('../../hooks/useProxies', () => ({
  useProxies: (keys: string[]) => mockUseProxies(keys),
}));

jest.mock('../../hooks/useController', () => ({
  useController: (proxies: unknown[]) => mockUseController(proxies),
}));

jest.mock('../ControllerOverlay', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    ControllerOverlay: ({ primaryProxy, tooltipText, children }: any) => {
      mockOverlaySpy({ primaryProxy, tooltipText });
      return ReactActual.createElement(
        'div',
        { 'data-testid': 'controller-overlay' },
        children
      );
    },
  };
});

import { ControllerContainer } from '../ControllerContainer';

describe('ControllerContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseContainer.mockReturnValue({
      containerStyle: { pointerEvents: 'auto' },
      contentsStyle: { display: 'block' },
    });
  });

  it('renders the renderer with controller ctx and forwards primaryProxy to the overlay', () => {
    const primaryProxy = {
      root: { deviceId: 'DEVICE_A', status: ProxyStatus.MONITORING },
      path: 'speed',
      binding: {},
      value: 42,
    };
    const proxies = [primaryProxy];
    const ctx = {
      primary: {
        tooltipText: 'DEVICE_A.speed',
        disabledReason: undefined,
        binding: {
          accessMode: AccessMode.RECONFIGURABLE,
          requiredAccessLevel: AccessLevel.OBSERVER,
        },
        userAccessLevel: AccessLevel.OBSERVER,
      },
      primaryProxy,
      proxies,
      userAccessLevel: AccessLevel.OBSERVER,
    };
    const Renderer = jest.fn(({ ctx: rendererCtx }) => (
      <div data-testid="renderer">{rendererCtx.primary.tooltipText}</div>
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
        primaryProxy,
        tooltipText: 'DEVICE_A.speed',
      })
    );
  });
});
