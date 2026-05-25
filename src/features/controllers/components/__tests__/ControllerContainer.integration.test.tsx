import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DeviceProxy, PropertyProxy } from '@/lib/binding/api';
import { SingletonContext } from '@/testing';

const mockUseContainer = jest.fn();
const mockOverlaySpy = jest.fn();

jest.mock('../../hooks/useContainer', () => ({
  useContainer: () => mockUseContainer(),
}));

jest.mock('../ControllerOverlay', () => {
  const mockReactActual = jest.requireActual<typeof React>('react');

  return {
    ControllerOverlay: ({ proxy, indicator, tooltipText, children }: any) => {
      mockOverlaySpy({ proxy, indicator, tooltipText });
      return mockReactActual.createElement(
        'div',
        { 'data-testid': 'controller-overlay' },
        children
      );
    },
  };
});

import { ControllerContainer } from '../ControllerContainer';

type MockDevice = DeviceProxy & {
  stopMonitoring: jest.Mock;
};

const makeTopology = () => {
  const devices = new Map<string, MockDevice>();

  const getDevice = jest.fn((deviceId: string) => {
    let device = devices.get(deviceId);
    if (!device) {
      const stopMonitoring = jest.fn();
      device = new DeviceProxy(deviceId) as MockDevice;
      device.stopMonitoring = stopMonitoring;
      jest.spyOn(device, 'addMonitor').mockReturnValue(stopMonitoring);
      devices.set(deviceId, device);
    }
    return device;
  });

  return {
    devices,
    topology: { getDevice },
  };
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

  it('owns proxies, derives controller context, passes ctx to the widget, and drives the overlay from the same proxy', async () => {
    const { devices, topology } = makeTopology();
    const disposeSpy = jest.spyOn(PropertyProxy.prototype, 'dispose');
    let lastCtx: any;

    const Renderer = jest.fn(({ ctx }) => {
      lastCtx = ctx;
      return (
        <div data-testid="renderer">
          {ctx.primary.deviceId}:{ctx.primary.propertyPath}:{ctx.proxies.length}
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
      expect(devices.get('DEVICE_A')?.addMonitor).toHaveBeenCalledTimes(1);
      expect(devices.get('DEVICE_B')?.addMonitor).toHaveBeenCalledTimes(1);

      expect(lastCtx.proxy).toBe(lastCtx.proxies[0]);
      expect(lastCtx.primary.deviceId).toBe('DEVICE_A');
      expect(lastCtx.primary.propertyPath).toBe('speed');
      expect(lastCtx.proxies[1].root.deviceId).toBe('DEVICE_B');
      expect(screen.getByTestId('controller-overlay')).toBeInTheDocument();

      const overlayCall = mockOverlaySpy.mock.calls.at(-1)?.[0];
      expect(overlayCall.proxy).toBe(lastCtx.proxy);
      expect(overlayCall.indicator).toEqual(
        expect.objectContaining({
          bindingLabel: 'DEVICE_A.speed, DEVICE_B.temperature',
        })
      );
      expect(overlayCall.tooltipText).toBe(
        'DEVICE_A.speed, DEVICE_B.temperature'
      );

      unmount();

      expect(devices.get('DEVICE_A')?.stopMonitoring).toHaveBeenCalledTimes(1);
      expect(devices.get('DEVICE_B')?.stopMonitoring).toHaveBeenCalledTimes(1);
      expect(disposeSpy).toHaveBeenCalledTimes(2);
    });
  });
});
