import { render, screen } from '@testing-library/react';
import { DeviceProxy, PropertyProxy, ProxyStatus } from '@/lib/binding/api';

import { ControllerOverlay } from '../ControllerOverlay';

describe('ControllerOverlay', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows a missing-property badge from the raw proxy when requested', () => {
    const deviceProxy = new DeviceProxy('DEVICE_A');
    (deviceProxy as any).status = ProxyStatus.MONITORING;
    const proxy = new PropertyProxy(deviceProxy, 'speed');
    (proxy as any).binding_existing = false;

    render(
      <ControllerOverlay proxies={[proxy]}>
        <div>child widget</div>
      </ControllerOverlay>
    );

    expect(screen.getByText('child widget')).toBeInTheDocument();
    expect(screen.getByTestId('missing-property-badge')).toBeInTheDocument();

    proxy.dispose();
  });

  it('shows an offline overlay from the raw proxy device status', () => {
    const deviceProxy = new DeviceProxy('DEVICE_A');
    (deviceProxy as any).status = ProxyStatus.OFFLINE;
    const proxy = new PropertyProxy(deviceProxy, 'speed');

    render(
      <ControllerOverlay proxies={[proxy]}>
        <div>child widget</div>
      </ControllerOverlay>
    );

    expect(screen.getByTestId('offline-overlay')).toBeInTheDocument();

    proxy.dispose();
  });
});
