import { useCallback, useSyncExternalStore } from 'react';
import type { TabId } from '@/components/api';
import { getPanelWrangler } from '@/lib/singletons/api';
import type { PanelSlot, PanelState } from '../types';

export interface PanelAreaController {
  area: PanelState;
  onTabSelect: (tabId: TabId) => void;
  onTabClose: (tabId: TabId) => void;
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
    (tabId: TabId) => {
      getPanelWrangler().selectTab(slot, tabId);
    },
    [slot]
  );

  const onTabClose = useCallback(
    (tabId: TabId) => {
      getPanelWrangler().closeTab(slot, tabId);
    },
    [slot]
  );

  return { area: state[slot], onTabSelect, onTabClose };
}
