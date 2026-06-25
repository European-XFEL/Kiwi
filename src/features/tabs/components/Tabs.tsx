import { useMemo } from 'react';
import type {
  TabGroupModel,
  TabId,
  TabItem,
  TabModel,
  TabsProps,
} from '../types';
import TabView from './TabView';

function createTabModels(items: TabItem[]): Record<TabId, TabModel> {
  return items.reduce<Record<TabId, TabModel>>((acc, item) => {
    acc[item.id] = {
      id: item.id,
      title: item.title,
      closable: item.closable,
      disabled: item.disabled,
      dirty: item.dirty,
    };

    return acc;
  }, {});
}

function createPanelsById(items: TabItem[]) {
  return items.reduce<Record<TabId, TabItem['panel']>>((acc, item) => {
    acc[item.id] = item.panel;
    return acc;
  }, {});
}

export default function Tabs({
  id,
  kind = 'default',
  items,
  activeTabId,
  defaultActiveTabId,
  ariaLabel,
  className,
  panelClassName,
  onTabSelect,
  onTabClose,
  onTabContextMenu,
}: TabsProps) {
  const group = useMemo<TabGroupModel>(() => {
    return {
      id,
      kind,
      tabOrder: items.map((item) => item.id),
      tabs: createTabModels(items),
      activeTabId,
    };
  }, [id, kind, items, activeTabId]);

  const panelsById = useMemo(() => createPanelsById(items), [items]);

  return (
    <TabView
      activeTabId={activeTabId}
      ariaLabel={ariaLabel}
      className={className}
      panelClassName={panelClassName}
      defaultActiveTabId={defaultActiveTabId}
      group={group}
      onTabClose={onTabClose}
      onTabContextMenu={onTabContextMenu}
      onTabSelect={onTabSelect}
      renderPanel={(tab) => panelsById[tab.id] ?? null}
    />
  );
}
