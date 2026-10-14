import { memo, type ReactNode, type Ref } from 'react';
import { cn, Tabs, type TabItem } from '@/components/api';
import icons from '@/assets/icons';
import { HOME_TAB_ID } from '@/lib/singletons/PanelWrangler';
import usePanelArea from '../hooks/usePanelArea';
import type { PanelSlot, PanelTab } from '../types';

const homeTabIcon = <img alt="" className="h-4 w-4" src={icons.homeEdit} />;
const sceneTabIcon = <img alt="" className="h-4 w-4" src={icons.image} />;

interface PanelContainerProps {
  area: PanelSlot;
  renderPanel: (tab: PanelTab) => ReactNode;
  emptyState?: ReactNode;
  className?: string;
  containerRef?: Ref<HTMLElement>;
  // Overrides the default tab-panel styling. Pass this when the rendered panel
  // owns its own overflow/layout (e.g. a scene viewport) so the generic
  // overflow-auto/padding don't create nested scroll.
  panelClassName?: string;
}

function PanelContainer({
  area,
  renderPanel,
  emptyState,
  className,
  containerRef,
  panelClassName,
}: PanelContainerProps) {
  const { area: areaModel, onTabSelect, onTabClose } = usePanelArea(area);

  if (areaModel.tabs.length === 0) {
    return (
      <section
        ref={containerRef}
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

  const activeTab =
    areaModel.tabs.find((tab) => tab.id === areaModel.activeTabId) ??
    areaModel.tabs[0];
  const items: TabItem[] = areaModel.tabs.map((tab) => {
    let icon: ReactNode;
    if (area === 'center') {
      icon = tab.id === HOME_TAB_ID ? homeTabIcon : sceneTabIcon;
    }
    return {
      id: tab.id,
      title: tab.title,
      icon,
      closable: tab.closable,
      panel: tab.id === activeTab.id ? renderPanel(tab) : null,
    };
  });

  return (
    <section
      ref={containerRef}
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
        activeTabId={activeTab.id}
        items={items}
        panelClassName={panelClassName}
        onTabSelect={onTabSelect}
        onTabClose={onTabClose}
      />
    </section>
  );
}

export default memo(PanelContainer);
