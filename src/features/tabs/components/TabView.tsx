import { useCallback, useMemo, useState } from 'react';
import { cn } from '@/components/api';
import type { TabGroupId, TabId, TabModel, TabViewProps } from '../types';
import TabGroup from './TabGroup';
import TabPanel from './TabPanel';

function getOrderedTabs(group: TabViewProps['group']): TabModel[] {
  return group.tabOrder
    .map((tabId) => group.tabs[tabId])
    .filter((tab): tab is TabModel => Boolean(tab));
}

function getFirstEnabledTab(tabs: TabModel[]): TabModel | undefined {
  return tabs.find((tab) => !tab.disabled);
}

function getActiveTab(
  tabs: TabModel[],
  activeTabId: TabId | undefined
): TabModel | undefined {
  const requestedTab = tabs.find(
    (tab) => tab.id === activeTabId && !tab.disabled
  );

  return requestedTab ?? getFirstEnabledTab(tabs) ?? tabs[0];
}

export default function TabView({
  group,
  renderPanel,
  activeTabId: controlledActiveTabId,
  defaultActiveTabId,
  ariaLabel,
  className,
  panelClassName,
  onTabSelect,
  onTabClose,
  onTabContextMenu,
}: TabViewProps) {
  const tabs = useMemo(
    () => getOrderedTabs(group),
    [group.tabOrder, group.tabs]
  );

  const initialActiveTabId =
    defaultActiveTabId ?? group.activeTabId ?? getFirstEnabledTab(tabs)?.id;

  const [localActiveTabId, setLocalActiveTabId] = useState<TabId | undefined>(
    initialActiveTabId
  );

  const isControlled = controlledActiveTabId !== undefined;

  const activeTab = getActiveTab(
    tabs,
    isControlled ? controlledActiveTabId : localActiveTabId
  );

  const handleTabSelect = useCallback(
    (groupId: TabGroupId, tabId: TabId) => {
      const selectedTab = tabs.find((tab) => tab.id === tabId);

      if (!selectedTab || selectedTab.disabled) {
        return;
      }

      if (!isControlled) {
        setLocalActiveTabId(tabId);
      }

      onTabSelect?.(groupId, tabId);
    },
    [isControlled, onTabSelect, tabs]
  );

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground',
        className
      )}
      data-tab-group-kind={group.kind}
    >
      <TabGroup
        activeTabId={activeTab?.id}
        ariaLabel={ariaLabel}
        groupId={group.id}
        onTabClose={onTabClose}
        onTabContextMenu={onTabContextMenu}
        onTabSelect={handleTabSelect}
        tabs={tabs}
      />

      <div className="min-h-0 flex-1 bg-background">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab?.id;

          return (
            <TabPanel
              className={panelClassName}
              id={`${group.id}-${tab.id}-panel`}
              isActive={isActive}
              key={tab.id}
              labelledBy={`${group.id}-${tab.id}`}
            >
              {isActive ? renderPanel(tab) : null}
            </TabPanel>
          );
        })}
      </div>
    </div>
  );
}
