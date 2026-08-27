import { memo, type KeyboardEvent } from 'react';
import type { TabGroupViewProps, TabId, TabModel } from '../types';
import TabButton from './TabButton';

function getEnabledTabs(tabs: TabModel[]) {
  return tabs.filter((tab) => !tab.disabled);
}

function getLastEnabledTab(tabs: TabModel[]) {
  const enabledTabs = getEnabledTabs(tabs);
  return enabledTabs[enabledTabs.length - 1];
}

function getNextTabId(
  tabs: TabModel[],
  activeTabId: TabId | undefined,
  direction: 'next' | 'previous'
): TabId | undefined {
  const enabledTabs = getEnabledTabs(tabs);

  if (enabledTabs.length === 0) {
    return undefined;
  }

  const activeIndex = enabledTabs.findIndex((tab) => tab.id === activeTabId);

  if (activeIndex === -1) {
    return enabledTabs[0]?.id;
  }

  if (direction === 'next') {
    return enabledTabs[(activeIndex + 1) % enabledTabs.length]?.id;
  }

  return enabledTabs[
    (activeIndex - 1 + enabledTabs.length) % enabledTabs.length
  ]?.id;
}

const TabGroup = memo(function TabGroup({
  groupId,
  tabs,
  activeTabId,
  ariaLabel,
  onTabSelect,
  onTabClose,
  onTabContextMenu,
}: TabGroupViewProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;

    if (target.getAttribute('role') !== 'tab') {
      return;
    }

    let nextTabId: TabId | undefined;

    switch (event.key) {
      case 'ArrowRight':
        nextTabId = getNextTabId(tabs, activeTabId, 'next');
        break;

      case 'ArrowLeft':
        nextTabId = getNextTabId(tabs, activeTabId, 'previous');
        break;

      case 'Home':
        nextTabId = getEnabledTabs(tabs)[0]?.id;
        break;

      case 'End':
        nextTabId = getLastEnabledTab(tabs)?.id;
        break;

      default:
        return;
    }

    if (!nextTabId) {
      return;
    }

    event.preventDefault();
    onTabSelect(groupId, nextTabId);

    requestAnimationFrame(() => {
      document.getElementById(`${groupId}-${nextTabId}`)?.focus();
    });
  };

  return (
    <div
      aria-label={ariaLabel ?? `${groupId} tabs`}
      className="flex h-10 shrink-0 items-stretch overflow-x-auto border-b border-border bg-muted/60"
      id={groupId}
      onKeyDown={handleKeyDown}
      role="tablist"
    >
      {tabs.map((tab) => (
        <TabButton
          groupId={groupId}
          isActive={tab.id === activeTabId}
          key={tab.id}
          onTabClose={onTabClose}
          onTabContextMenu={onTabContextMenu}
          onTabSelect={onTabSelect}
          tab={tab}
        />
      ))}
    </div>
  );
});

TabGroup.displayName = 'TabGroup';

export default TabGroup;
