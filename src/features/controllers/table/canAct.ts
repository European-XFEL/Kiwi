import type { ControllerContainerContext } from '@/features/scene-view/api';
import { ProxyStatus } from '@/lib/binding/api';

export function canAct(ctx?: ControllerContainerContext): boolean {
  const proxy = ctx?.proxy;
  const root = proxy?.root;
  const state = root?.state;
  const table = proxy?.binding;
  return !!(
    root?.deviceId &&
    proxy?.path &&
    table &&
    state &&
    root.status !== ProxyStatus.OFFLINE &&
    ctx!.userAccessLevel >= table.requiredAccessLevel &&
    table.is_allowed(state)
  );
}
