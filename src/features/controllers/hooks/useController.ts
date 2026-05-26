import { AccessLevel } from '@/karabo/data/enums';
import { useGlobalStore } from '@/store/globalAppStateStore';
import type { PropertyProxies } from '../utils/controller_proxies';

// ControllerContainerContext
// ---

export type { PropertyProxies };

export interface ControllerContainerContext {
  proxy: PropertyProxies[number] | undefined;
  proxies: PropertyProxies;
  userAccessLevel: AccessLevel;
}

const getProxy = (
  propertyProxies: PropertyProxies
): PropertyProxies[number] | undefined => propertyProxies[0];

// useController
// ---
// Receives ordered live proxies already created by useProxies.
// Owns: root-slot semantics for the controller root proxy.

export function useController(
  propertyProxies: PropertyProxies
): ControllerContainerContext {
  const userAccessLevel = useGlobalStore(
    (s) => s.sessionInfo?.accessLevel ?? AccessLevel.OBSERVER
  );

  return {
    proxy: getProxy(propertyProxies),
    proxies: propertyProxies,
    userAccessLevel,
  };
}
