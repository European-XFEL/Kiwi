import { useCallback, useSyncExternalStore } from 'react';
import type { TabId } from '@/components/api';
import { getPanelWrangler } from '@/lib/singletons/api';
import type { PanelAreaState, PanelSlot, PanelState } from '../types';

export interface PanelAreaController<Area extends PanelState = PanelState> {
  area: Area;
  onTabSelect: (tabId: TabId) => void;
  onTabClose: (tabId: TabId) => void;
}

/**
 * Subscribes a panel slot to the PanelWrangler singleton and exposes the area
 * state plus tab intent handlers, keeping the wrangler wiring out of the view.
 */
export default function usePanelArea<Slot extends PanelSlot>(
  slot: Slot
): PanelAreaController<PanelAreaState[Slot]> {
  const wrangler = getPanelWrangler();

  const getAreaSnapshot = useCallback(
    () => wrangler.getSnapshot()[slot],
    [slot, wrangler]
  );
  const area = useSyncExternalStore(
    wrangler.subscribe,
    getAreaSnapshot,
    getAreaSnapshot
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

  return { area, onTabSelect, onTabClose };
}
