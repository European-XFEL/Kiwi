import { useLayoutEffect, useSyncExternalStore } from 'react';
import { getPanelWrangler } from '@/lib/singletons/api';
import { PROJECTS_TAB_ID } from '../configuration';

export function useProjectPanelActivation({
  enabled,
  onExpandedChange,
}: {
  enabled: boolean;
  onExpandedChange: (expanded: boolean) => void;
}): void {
  const wrangler = getPanelWrangler();
  const activation = useSyncExternalStore(
    wrangler.subscribe,
    () => wrangler.getSnapshot().projectPanelActivation
  );
  // Loading replaces the body with a progress view. Seed from the singleton
  // so a dialog activation also reveals Projects after the body remounts.
  useLayoutEffect(() => {
    if (
      enabled &&
      activation &&
      wrangler.getSnapshot().left.activeTabId === PROJECTS_TAB_ID
    ) {
      onExpandedChange(true);
    }
  }, [activation, enabled, onExpandedChange, wrangler]);
}
