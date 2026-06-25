import { useMemo, useSyncExternalStore } from 'react';
import {
  TabController,
  type TabControllerAdapter,
  type TabControllerOptions,
} from '../utils/tab-controller';

export function useCreateTabController<TModel>(
  adapter: TabControllerAdapter<TModel>,
  options?: TabControllerOptions<TModel>
) {
  // Keep one controller instance for the lifetime of this adapter/options pair.
  return useMemo(() => {
    return new TabController<TModel>(adapter, options);
  }, [adapter, options]);
}

export function useTabControllerState<TModel>(
  controller: TabController<TModel>
) {
  // Bridge the controller's subscribe/getSnapshot pair into React rendering.
  return useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot
  );
}
