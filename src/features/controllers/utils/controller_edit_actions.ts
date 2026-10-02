import type { PropertyProxies } from './controller_proxies';

export function applyControllerEdits(proxies: PropertyProxies): void {
  proxies.forEach((proxy) => {
    if (proxy.edit_value !== undefined) {
      console.log(proxy.key, proxy.edit_value);
    }
  });
}

export function declineControllerEdits(proxies: PropertyProxies): void {
  proxies.forEach((proxy) => {
    proxy.edit_value = undefined;
  });
}
