import { AccessLevel } from '@/karabo/data/enums';
import { PropertyProxy, ProxyStatus } from '@/lib/binding/api';

// Formats the user-facing binding label from authored controller keys.
export const getModelKeys = (
  sourceKeys: readonly string[]
): string | undefined => {
  const nonEmptyLabels = sourceKeys.filter(Boolean);
  return nonEmptyLabels.length > 0 ? nonEmptyLabels.join(', ') : undefined;
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
