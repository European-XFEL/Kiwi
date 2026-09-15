import { memo, type ReactNode, useCallback, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from './utils/cn';

export type TabId = string;

export interface TabItem {
  id: TabId;
  title: string;
  panel: ReactNode;
  icon?: ReactNode;
  closable?: boolean;
  disabled?: boolean;
  dirty?: boolean;
}

export interface TabsProps {
  id: string;
  items: TabItem[];
  activeTabId?: TabId;
  defaultActiveTabId?: TabId;
  ariaLabel?: string;
  className?: string;
  panelClassName?: string;
  onTabSelect?: (tabId: TabId) => void;
  onTabClose?: (tabId: TabId) => void;
}

interface TabButtonProps {
  groupId: string;
  tab: TabItem;
  isActive: boolean;
  onSelect: (tabId: TabId) => void;
  onClose?: (tabId: TabId) => void;
}

const TabButton = memo(function TabButton({
  groupId,
  tab,
  isActive,
  onSelect,
  onClose,
}: TabButtonProps) {
  const tabButtonId = `${groupId}-${tab.id}`;
  const tabPanelId = `${groupId}-${tab.id}-panel`;

  return (
    <div
      role="presentation"
      data-tab-wrapper
      className={cn(
        'group/tab relative flex h-full min-w-0 shrink-0 items-center border-r border-border transition-colors',
        "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:content-['']",
        isActive
          ? 'bg-background after:bg-primary'
          : 'bg-muted/40 after:bg-transparent hover:bg-background',
        tab.disabled && 'opacity-50'
      )}
    >
      <button
        aria-controls={tabPanelId}
        aria-selected={isActive}
        data-active={isActive}
        disabled={tab.disabled}
        id={tabButtonId}
        onClick={() => onSelect(tab.id)}
        role="tab"
        tabIndex={isActive ? 0 : -1}
        type="button"
        className={cn(
          'flex h-full min-w-0 items-center gap-2 px-3 text-sm outline-none transition-colors',
          'focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          'disabled:pointer-events-none disabled:cursor-not-allowed',
          isActive
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {tab.icon ? (
          <span aria-hidden="true" className="shrink-0">
            {tab.icon}
          </span>
        ) : null}
        <span className="max-w-44 truncate">{tab.title}</span>

        {tab.dirty ? (
          <span
            aria-label="Unsaved changes"
            title="Unsaved changes"
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              isActive ? 'bg-primary' : 'bg-amber-500'
            )}
          />
        ) : null}
      </button>

      {tab.closable && onClose ? (
        <button
          aria-label={`Close ${tab.title}`}
          onClick={() => onClose(tab.id)}
          tabIndex={isActive ? 0 : -1}
          type="button"
          className={cn(
            'mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
            'text-muted-foreground hover:bg-muted hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
            isActive
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0 group-hover/tab:pointer-events-auto group-hover/tab:opacity-100'
          )}
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
});

TabButton.displayName = 'TabButton';

function getEnabledTabs(items: TabItem[]) {
  return items.filter((tab) => !tab.disabled);
}

function getActiveTab(
  items: TabItem[],
  activeTabId: TabId | undefined
): TabItem | undefined {
  return (
    items.find((tab) => tab.id === activeTabId && !tab.disabled) ??
    getEnabledTabs(items)[0] ??
    items[0]
  );
}

export function Tabs({
  id,
  items,
  activeTabId: controlledActiveTabId,
  defaultActiveTabId,
  ariaLabel,
  className,
  panelClassName,
  onTabSelect,
  onTabClose,
}: TabsProps) {
  const [localActiveTabId, setLocalActiveTabId] = useState<TabId | undefined>(
    defaultActiveTabId ?? getActiveTab(items, undefined)?.id
  );
  const isControlled = controlledActiveTabId !== undefined;
  const activeTab = getActiveTab(
    items,
    isControlled ? controlledActiveTabId : localActiveTabId
  );

  const handleTabSelect = useCallback(
    (tabId: TabId) => {
      const selectedTab = items.find((tab) => tab.id === tabId);

      if (!selectedTab || selectedTab.disabled) {
        return;
      }

      if (!isControlled) {
        setLocalActiveTabId(tabId);
      }

      onTabSelect?.(tabId);
    },
    [isControlled, items, onTabSelect]
  );

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground',
        className
      )}
    >
      <div
        aria-label={ariaLabel ?? `${id} tabs`}
        className="flex h-10 shrink-0 items-stretch overflow-x-auto border-b border-border bg-muted/60"
        id={id}
        role="tablist"
      >
        {items.map((tab) => (
          <TabButton
            groupId={id}
            isActive={tab.id === activeTab?.id}
            key={tab.id}
            onClose={onTabClose}
            onSelect={handleTabSelect}
            tab={tab}
          />
        ))}
      </div>

      <div className="min-h-0 flex-1 bg-background">
        {items.map((tab) => {
          const isActive = tab.id === activeTab?.id;

          return (
            <section
              aria-labelledby={`${id}-${tab.id}`}
              hidden={!isActive}
              id={`${id}-${tab.id}-panel`}
              key={tab.id}
              role="tabpanel"
              tabIndex={0}
              className={cn(
                'h-full min-h-0 outline-none',
                panelClassName ?? 'overflow-auto bg-background p-5'
              )}
            >
              {isActive ? tab.panel : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
