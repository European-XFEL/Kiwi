import { AccessLevel, AccessMode } from '@/karabo/data/enums';
import {
  BindingRoot,
  DeviceProxy,
  PropertyProxy,
  ProxyStatus,
} from '@/lib/binding/api';
import { createPropertyProxySnapshots } from '../controller_proxies';
import {
  getModelKeys,
  isControllerEditable,
  isProxyAllowed,
} from '../controller_semantics';

describe('controller semantics utilities', () => {
  it('derives binding identity text from authored controller keys and the raw proxy fallback', () => {
    const deviceA = new DeviceProxy('DEVICE_A');
    deviceA.binding = new BindingRoot();
    const deviceB = new DeviceProxy('DEVICE_B');
    deviceB.binding = new BindingRoot();

    const proxies = [
      new PropertyProxy(deviceA, 'speed'),
      new PropertyProxy(deviceB, 'temperature'),
    ];
    const snapshots = createPropertyProxySnapshots(proxies);
    const sourceKeys = snapshots.map((snapshot) => snapshot.proxy.key);

    expect(getModelKeys(sourceKeys)).toBe(
      'DEVICE_A.speed, DEVICE_B.temperature'
    );
    proxies.forEach((proxy) => proxy.dispose());
  });

  it('matches current proxy-allowed semantics from the proxy and access level', () => {
    const deviceProxy = new DeviceProxy('DEVICE_A');
    (deviceProxy as any).status = ProxyStatus.MONITORING;
    jest.spyOn(deviceProxy, 'state', 'get').mockReturnValue('ACTIVE');

    const proxy = new PropertyProxy(deviceProxy, 'speed');
    proxy.binding = {
      accessMode: AccessMode.RECONFIGURABLE,
      requiredAccessLevel: AccessLevel.OPERATOR,
      is_allowed: (state: string) => state === 'ACTIVE',
    } as any;

    expect(isProxyAllowed(proxy, AccessLevel.OPERATOR)).toBe(true);
    expect(isProxyAllowed(proxy, AccessLevel.OBSERVER)).toBe(false);
    expect(isProxyAllowed(undefined, AccessLevel.OPERATOR)).toBe(false);

    proxy.dispose();
  });

  it('matches current controller-level canEdit semantics from proxy and access level', () => {
    const deviceProxy = new DeviceProxy('DEVICE_A');
    (deviceProxy as any).status = ProxyStatus.MONITORING;
    jest.spyOn(deviceProxy, 'state', 'get').mockReturnValue('ACTIVE');

    const proxy = new PropertyProxy(deviceProxy, 'speed');
    proxy.binding = {
      accessMode: AccessMode.RECONFIGURABLE,
      requiredAccessLevel: AccessLevel.OPERATOR,
      is_allowed: (state: string) => state === 'ACTIVE',
    } as any;

    expect(isControllerEditable(proxy, AccessLevel.OPERATOR)).toBe(true);
    expect(isControllerEditable(proxy, AccessLevel.OBSERVER)).toBe(false);
    expect(isControllerEditable(undefined, AccessLevel.OPERATOR)).toBe(false);

    (deviceProxy as any).status = ProxyStatus.OFFLINE;
    expect(isControllerEditable(proxy, AccessLevel.OPERATOR)).toBe(false);

    proxy.dispose();
  });
});
