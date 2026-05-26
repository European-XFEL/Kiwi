import { AccessLevel, AccessMode } from '@/karabo/data/enums';
import { PROPERTY_MISSING_INDICATOR } from '@/lib/OverlayIndicator';
import {
  BindingRoot,
  DeviceProxy,
  PropertyProxy,
  PropertyStatus,
  ProxyStatus,
  StringBinding,
} from '@/lib/binding/api';
import { createPropertyProxySnapshots } from '../controller_proxies';
import {
  getControllerBindingLabel,
  getControllerDisabledReason,
  getControllerIndicator,
  getMissingPropertyIndicator,
  getPrimaryControllerKey,
  getProxyPropertyIndicator,
  getProxyBindingLabel,
  getProxyPropertyStatus,
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
    const sourceKeys = snapshots.map((snapshot) => snapshot.sourceKey);

    expect(getPrimaryControllerKey(snapshots)).toBe('DEVICE_A.speed');
    expect(getControllerBindingLabel(sourceKeys)).toBe(
      'DEVICE_A.speed, DEVICE_B.temperature'
    );
    expect(getProxyBindingLabel(proxies[0])).toBe('DEVICE_A.speed');

    proxies.forEach((proxy) => proxy.dispose());
  });

  it('returns text when a widget has no property key configured', () => {
    const deviceProxy = new DeviceProxy('DEVICE_A');
    const proxy = new PropertyProxy(deviceProxy, 'speed');

    expect(getControllerDisabledReason('', proxy)).toBe(
      'No property specified'
    );

    proxy.dispose();
  });

  it('returns a neutral text when a property binding is unavailable before the schema loads', () => {
    const deviceProxy = new DeviceProxy('DEVICE_A');
    (deviceProxy as any).status = ProxyStatus.ONLINEREQUESTED;
    const proxy = new PropertyProxy(deviceProxy, 'speed');

    expect(getControllerIndicator(['DEVICE_A.speed'], proxy)).toMatchObject({
      bindingLabel: 'DEVICE_A.speed',
      statusText: 'DEVICE_A.speed binding unavailable',
      propertyStatus: PropertyStatus.NONE,
      propertyIndicator: undefined,
      missingPropertyIndicator: undefined,
    });

    proxy.dispose();
  });

  it('returns missing-from-schema text once the device schema is loaded and the property is absent', () => {
    const deviceProxy = new DeviceProxy('DEVICE_A');
    (deviceProxy as any).status = ProxyStatus.SCHEMA;
    const proxy = new PropertyProxy(deviceProxy, 'speed');

    expect(getControllerDisabledReason('DEVICE_A.speed', proxy)).toBe(
      'DEVICE_A.speed missing from Schema'
    );
    expect(getControllerIndicator(['DEVICE_A.speed'], proxy)).toMatchObject({
      bindingLabel: 'DEVICE_A.speed',
      statusText: 'DEVICE_A.speed missing from Schema',
      propertyStatus: PropertyStatus.MISSING,
      propertyIndicator: PROPERTY_MISSING_INDICATOR,
      missingPropertyIndicator: PROPERTY_MISSING_INDICATOR,
    });

    proxy.dispose();
  });

  it('returns offline text when the device is offline', () => {
    const deviceProxy = new DeviceProxy('DEVICE_A');
    const proxy = new PropertyProxy(deviceProxy, 'speed');
    (deviceProxy as any).status = ProxyStatus.OFFLINE;

    expect(getControllerDisabledReason('DEVICE_A.speed', proxy)).toBe(
      'DEVICE_A.speed (offline)'
    );

    proxy.dispose();
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

  it('falls back to the raw proxy identity and neutral status text when authored controller keys are unavailable', () => {
    const deviceProxy = new DeviceProxy('DEVICE_A');
    (deviceProxy as any).status = ProxyStatus.ONLINEREQUESTED;
    const proxy = new PropertyProxy(deviceProxy, 'speed');

    expect(getControllerIndicator([], proxy)).toMatchObject({
      bindingLabel: 'DEVICE_A.speed',
      statusText: 'DEVICE_A.speed binding unavailable',
      propertyStatus: PropertyStatus.NONE,
      propertyIndicator: undefined,
      missingPropertyIndicator: undefined,
    });

    proxy.dispose();
  });

  it('keeps binding-unavailable properties neutral until the schema proves they are missing', () => {
    const deviceProxy = new DeviceProxy('DEVICE_A');
    const proxy = new PropertyProxy(deviceProxy, 'speed');

    (deviceProxy as any).status = ProxyStatus.ONLINE;
    expect(getProxyPropertyStatus(proxy)).toBe(PropertyStatus.NONE);
    expect(getProxyPropertyIndicator(proxy)).toBeUndefined();
    expect(getMissingPropertyIndicator(proxy)).toBeUndefined();

    (deviceProxy as any).status = ProxyStatus.SCHEMA;
    deviceProxy.schema_update.fire();
    expect(getProxyPropertyStatus(proxy)).toBe(PropertyStatus.MISSING);
    expect(getProxyPropertyIndicator(proxy)).toBe(PROPERTY_MISSING_INDICATOR);
    expect(getMissingPropertyIndicator(proxy)).toBe(PROPERTY_MISSING_INDICATOR);

    deviceProxy.binding.value!.set(
      'speed',
      new StringBinding({ value: 'available again' })
    );
    deviceProxy.schema_update.fire();

    expect(getProxyPropertyStatus(proxy)).toBe(PropertyStatus.NONE);
    expect(getProxyPropertyIndicator(proxy)).toMatchObject({
      status: PropertyStatus.NONE,
      label: 'Property available',
    });
    expect(getMissingPropertyIndicator(proxy)).toBeUndefined();

    proxy.dispose();
  });
});
