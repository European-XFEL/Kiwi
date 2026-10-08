import type { PropertyProxies } from './controller_proxies';
import { send_property_changes } from '@/lib/request';

export function applyControllerEdits(proxies: PropertyProxies): void {
  send_property_changes(
    proxies.filter((proxy) => proxy.edit_value !== undefined)
  );
}

export function declineControllerEdits(proxies: PropertyProxies): void {
  proxies.forEach((proxy) => {
    proxy.edit_value = undefined;
  });
}
