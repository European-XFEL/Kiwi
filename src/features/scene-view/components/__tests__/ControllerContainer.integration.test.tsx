import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { PropertyProxy } from '@/lib/binding/api';
import { createMockSystemTopology, SingletonContext } from '@/testing';

const mockUseContainer = jest.fn();
const mockOverlaySpy = jest.fn();

jest.mock('@/features/controllers/api', () => ({
  getModelKeys: jest.fn(() => ''),
  useContainer: () => mockUseContainer(),
  useController: jest.requireActual<
    typeof import('@/features/controllers/hooks/useController')
  >('@/features/controllers/hooks/useController').useController,
  useProxies: jest.requireActual<
    typeof import('@/features/controllers/hooks/useProxies')
  >('@/features/controllers/hooks/useProxies').useProxies,
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
