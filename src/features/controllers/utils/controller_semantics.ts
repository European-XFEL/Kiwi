import { AccessLevel } from '@/karabo/data/enums';
import { PROPERTY_INDICATORS } from '@/lib/OverlayIndicator';
import {
  PropertyStatus,
  PropertyProxy,
  ProxyStatus,
  type ProxyBindingIcon,
} from '@/lib/binding/api';
import type { PropertyProxySnapshot } from './controller_proxies';

// Keeps the controller root key tied to the authored first proxy slot.
export const getPrimaryControllerKey = (
  proxySnapshots: PropertyProxySnapshot[]
): string => proxySnapshots[0]?.sourceKey ?? '';

// Formats the user-facing binding label from authored controller keys.
export const getControllerBindingLabel = (
  sourceKeys: readonly string[]
): string | undefined => {
  const nonEmptyLabels = sourceKeys.filter(Boolean);

  return nonEmptyLabels.length > 0 ? nonEmptyLabels.join(', ') : undefined;
};

// Derives the raw proxy key when the authored controller keys are unavailable.
export const getProxyBindingLabel = (
  proxy: PropertyProxy | undefined
): string | undefined => {
  const deviceId = proxy?.root.deviceId ?? '';
  const propertyPath = proxy?.path ?? '';

  return deviceId && propertyPath ? `${deviceId}.${propertyPath}` : undefined;
};

// A proxy is only marked missing after schema refresh has explicitly marked the
// property as not existing. Before that, a missing binding is treated as a
// temporary unavailable state rather than a confirmed missing property.
export const getProxyPropertyStatus = (
  proxy: PropertyProxy | undefined
): PropertyStatus => {
  if (!proxy) return PropertyStatus.MISSING;
  return proxy.existing ? PropertyStatus.NONE : PropertyStatus.MISSING;
};

// Maps confirmed property states to the shared indicator metadata. Temporary
// binding-unavailable states do not expose a property indicator.
export const getProxyPropertyIndicator = (
  proxy: PropertyProxy | undefined
): ProxyBindingIcon | undefined => {
  if (proxy && !proxy.binding && proxy.existing) {
    return undefined;
  }

  const propertyStatus = getProxyPropertyStatus(proxy);

  return (
    PROPERTY_INDICATORS.find(
      (indicator) => indicator.status === propertyStatus
    ) ?? undefined
  );
};

// Exposes an overlay indicator only for the missing-property case.
export const getMissingPropertyIndicator = (
  proxy: PropertyProxy | undefined
): ProxyBindingIcon | undefined => {
  const propertyStatus = getProxyPropertyStatus(proxy);

  if (propertyStatus !== PropertyStatus.MISSING) return undefined;

  return getProxyPropertyIndicator(proxy);
};

// Preserves the current controller-level disabled text until callers migrate
// to compute presentation strings outside the controller context.
export const getControllerDisabledReason = (
  sourceKey: string,
  proxy: PropertyProxy | undefined
): string | undefined => {
  if (!sourceKey) return 'No property specified';

  const deviceId = proxy?.root.deviceId ?? '';
  const propertyPath = proxy?.path ?? '';

  if (!proxy || !deviceId || !propertyPath) return undefined;
  if (proxy.root.status === ProxyStatus.OFFLINE)
    return `${deviceId}.${propertyPath} (offline)`;
  if (!proxy.existing) return `${deviceId}.${propertyPath} missing from Schema`;
  if (!proxy.binding) return `${deviceId}.${propertyPath} binding unavailable`;

  return undefined;
};

export type ControllerIndicator = {
  bindingLabel?: string;
  statusText?: string;
  propertyStatus: PropertyStatus;
  propertyIndicator?: ProxyBindingIcon;
  missingPropertyIndicator?: ProxyBindingIcon;
};

// Centralises the controller indicator state so container and overlay do not rebuild
// identity text, status text, and missing-property indicator state independently.
export const getControllerIndicator = (
  sourceKeys: readonly string[],
  proxy: PropertyProxy | undefined
): ControllerIndicator => {
  const bindingLabel =
    getControllerBindingLabel(sourceKeys) ?? getProxyBindingLabel(proxy);
  const primaryKey =
    sourceKeys.find(Boolean) ?? getProxyBindingLabel(proxy) ?? '';
  const disabledReason = getControllerDisabledReason(primaryKey, proxy);
  const propertyStatus = getProxyPropertyStatus(proxy);
  const propertyIndicator = getProxyPropertyIndicator(proxy);
  const missingPropertyIndicator =
    propertyStatus === PropertyStatus.MISSING ? propertyIndicator : undefined;
  const statusText =
    disabledReason && disabledReason !== bindingLabel
      ? disabledReason
      : undefined;

  return {
    bindingLabel,
    statusText,
    propertyStatus,
    propertyIndicator,
    missingPropertyIndicator,
  };
};

// Thin wrapper around PropertyProxy.isEditable for callers that only need a
// boolean permission check from the raw proxy plus user access level.
export const isProxyAllowed = (
  proxy: PropertyProxy | undefined,
  userAccessLevel: AccessLevel
): boolean => !!proxy && proxy.isEditable(userAccessLevel);

// Returns the controller-level editability decision for the primary proxy.
// The proxy must resolve to a real device/path, the device must not be
// offline, and the proxy itself must still be editable for the given access
// level.
export const isControllerEditable = (
  proxy: PropertyProxy | undefined,
  userAccessLevel: AccessLevel
): boolean => {
  const deviceId = proxy?.root.deviceId ?? '';
  const propertyPath = proxy?.path ?? '';
  const proxyStatus = proxy?.root.status ?? ProxyStatus.OFFLINE;

  return (
    !!proxy &&
    !!deviceId &&
    !!propertyPath &&
    proxyStatus !== ProxyStatus.OFFLINE &&
    isProxyAllowed(proxy, userAccessLevel)
  );
};
