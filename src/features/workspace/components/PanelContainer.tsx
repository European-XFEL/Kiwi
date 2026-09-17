import type { ReactNode } from 'react';
import { cn, Tabs, type TabItem } from '@/components/api';
import icons from '@/assets/icons';
import { HOME_TAB_ID } from '@/lib/singletons/PanelWrangler';
import usePanelArea from '../hooks/usePanelArea';
import type { PanelSlot, PanelTab } from '../types';

interface PanelContainerProps {
  area: PanelSlot;
  renderPanel: (tab: PanelTab) => ReactNode;
  emptyState?: ReactNode;
  className?: string;
  // Overrides the default tab-panel styling. Pass this when the rendered panel
  // owns its own overflow/layout (e.g. a scene viewport) so the generic
  // overflow-auto/padding don't create nested scroll.
  panelClassName?: string;
}

export default function PanelContainer({
  area,
  renderPanel,
  emptyState,
  className,
  panelClassName,
}: PanelContainerProps) {
  const { area: areaModel, onTabSelect, onTabClose } = usePanelArea(area);

  if (areaModel.tabs.length === 0) {
    return (
      <section
        data-testid="workspace-panel"
        id={`workspace-panel-${area}`}
        className={cn(
          'flex h-full min-h-0 flex-col items-center justify-center overflow-hidden border bg-background',
          className
        )}
      >
        {emptyState ?? null}
      </section>
    );
  }

  const items: TabItem[] = areaModel.tabs.map((tab) => ({
    id: tab.id,
    title: tab.title,
    icon:
      area === 'center' ? (
        <img
          alt=""
          className="h-4 w-4"
          src={tab.id === HOME_TAB_ID ? icons.homeEdit : icons.image}
        />
      ) : undefined,
    closable: tab.closable,
    panel: renderPanel(tab),
  }));

  return (
    <section
      data-testid="workspace-panel"
      id={`workspace-panel-${area}`}
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden border bg-background',
        className
      )}
    >
      <Tabs
        id={`panel-container-${area}`}
        ariaLabel={`${area} panel`}
        activeTabId={areaModel.activeTabId}
        items={items}
        panelClassName={panelClassName}
        onTabSelect={onTabSelect}
        onTabClose={onTabClose}
      />
    </section>
  );
}
