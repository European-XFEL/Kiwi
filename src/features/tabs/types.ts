import type { MouseEvent, ReactNode } from 'react';

export type TabId = string;
export type TabGroupId = string;
export type TabGroupKind = string;

export interface TabModel {
  id: TabId;
  title: string;
  closable?: boolean;
  disabled?: boolean;
  dirty?: boolean;
}

export interface TabItem extends TabModel {
  panel: ReactNode;
}

export interface TabGroupModel {
  id: TabGroupId;
  kind: TabGroupKind;
  tabOrder: TabId[];
  tabs: Record<TabId, TabModel>;
  activeTabId?: TabId;
}

export interface TabContextModel {
  groups: Record<TabGroupId, TabGroupModel>;
  activeGroupId?: TabGroupId;
}

export interface TabGroupViewProps {
  groupId: TabGroupId;
  tabs: TabModel[];
  activeTabId?: TabId;
  ariaLabel?: string;
  onTabSelect: (groupId: TabGroupId, tabId: TabId) => void;
  onTabClose?: (groupId: TabGroupId, tabId: TabId) => void;
  onTabContextMenu?: (
    groupId: TabGroupId,
    tabId: TabId,
    event: MouseEvent<HTMLButtonElement>
  ) => void;
}

export interface TabButtonViewProps {
  groupId: TabGroupId;
  tab: TabModel;
  isActive: boolean;
  onTabSelect: (groupId: TabGroupId, tabId: TabId) => void;
  onTabClose?: (groupId: TabGroupId, tabId: TabId) => void;
  onTabContextMenu?: (
    groupId: TabGroupId,
    tabId: TabId,
    event: MouseEvent<HTMLButtonElement>
  ) => void;
}

export interface TabPanelViewProps {
  id: string;
  labelledBy: string;
  isActive: boolean;
  children: ReactNode;
  // Overrides the default panel styling (overflow/padding/background) when the
  // host owns its own layout, e.g. a scene viewport. Structural classes stay.
  className?: string;
}

export interface TabViewProps {
  group: TabGroupModel;
  renderPanel: (tab: TabModel) => ReactNode;
  activeTabId?: TabId;
  defaultActiveTabId?: TabId;
  ariaLabel?: string;
  className?: string;
  panelClassName?: string;
  onTabSelect?: (groupId: TabGroupId, tabId: TabId) => void;
  onTabClose?: (groupId: TabGroupId, tabId: TabId) => void;
  onTabContextMenu?: (
    groupId: TabGroupId,
    tabId: TabId,
    event: MouseEvent<HTMLButtonElement>
  ) => void;
}

export interface TabsProps {
  id: TabGroupId;
  kind?: TabGroupKind;
  items: TabItem[];
  activeTabId?: TabId;
  defaultActiveTabId?: TabId;
  ariaLabel?: string;
  className?: string;
  panelClassName?: string;
  onTabSelect?: (groupId: TabGroupId, tabId: TabId) => void;
  onTabClose?: (groupId: TabGroupId, tabId: TabId) => void;
  onTabContextMenu?: (
    groupId: TabGroupId,
    tabId: TabId,
    event: MouseEvent<HTMLButtonElement>
  ) => void;
}
