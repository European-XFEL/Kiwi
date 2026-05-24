import React from 'react';
import { render, screen } from '@testing-library/react';
import { DeviceProxy, PropertyProxy, ProxyStatus } from '@/lib/binding/api';

jest.mock('@/components/tooltip', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    Tooltip: ({ children }: any) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
    TooltipTrigger: ({ children }: any) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
    TooltipContent: ({ children }: any) =>
      ReactActual.createElement(
        'div',
        { 'data-testid': 'tooltip-content' },
        children
      ),
  };
});

import { ControllerOverlay } from '../ControllerOverlay';

describe('ControllerOverlay', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows a missing-property badge from the raw primary proxy when requested', () => {
    const deviceProxy = new DeviceProxy('DEVICE_A');
    (deviceProxy as any).status = ProxyStatus.MONITORING;
    const primaryProxy = new PropertyProxy(deviceProxy, 'speed');

    render(
      <ControllerOverlay
        primaryProxy={primaryProxy}
        tooltipText="DEVICE_A.speed"
        showMissingPropertyOverlay
      >
        <div>child widget</div>
      </ControllerOverlay>
    );

    expect(screen.getByText('child widget')).toBeInTheDocument();
    expect(screen.getByText('??')).toBeInTheDocument();

    primaryProxy.dispose();
  });

  it('shows the offline tooltip from the raw primary proxy device status', () => {
    const deviceProxy = new DeviceProxy('DEVICE_A');
    (deviceProxy as any).status = ProxyStatus.OFFLINE;
    const primaryProxy = new PropertyProxy(deviceProxy, 'speed');

    render(
      <ControllerOverlay
        primaryProxy={primaryProxy}
        tooltipText="DEVICE_A.speed"
      >
        <div>child widget</div>
      </ControllerOverlay>
    );

    expect(
      screen.getByText('Device is offline — no live data')
    ).toBeInTheDocument();
    expect(screen.getByText('DEVICE_A.speed')).toBeInTheDocument();

    primaryProxy.dispose();
  });
});
