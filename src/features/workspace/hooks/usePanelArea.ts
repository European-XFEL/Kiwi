import { useCallback, useSyncExternalStore } from 'react';
import type { TabGroupId, TabId } from '@/features/tabs/api';
import { getPanelWrangler } from '@/lib/singletons/api';
import type { PanelSlot, PanelState } from '../types';

export interface PanelAreaController {
  area: PanelState;
  onTabSelect: (groupId: TabGroupId, tabId: TabId) => void;
  onTabClose: (groupId: TabGroupId, tabId: TabId) => void;
}

/**
 * Subscribes a panel slot to the PanelWrangler singleton and exposes the area
 * state plus tab intent handlers, keeping the wrangler wiring out of the view.
 */
export default function usePanelArea(slot: PanelSlot): PanelAreaController {
  const wrangler = getPanelWrangler();

  const state = useSyncExternalStore(
    wrangler.subscribe,
    wrangler.getSnapshot,
    wrangler.getSnapshot
  );

  const onTabSelect = useCallback(
    (_groupId: TabGroupId, tabId: TabId) => {
      getPanelWrangler().selectTab(slot, tabId);
    },
    [slot]
  );

  const onTabClose = useCallback(
    (_groupId: TabGroupId, tabId: TabId) => {
      getPanelWrangler().closeTab(slot, tabId);
    },
    [slot]
  );

  return { area: state[slot], onTabSelect, onTabClose };
}
