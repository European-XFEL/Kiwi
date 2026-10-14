import {
  memo,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
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
  // Retain local content state while its tab is hidden.
  keepMounted?: boolean;
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

interface TabButtonProps extends Pick<
  TabItem,
  'id' | 'title' | 'icon' | 'closable' | 'disabled' | 'dirty'
> {
  groupId: string;
  isActive: boolean;
  onSelect: (tabId: TabId) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, tabId: TabId) => void;
  onClose?: (tabId: TabId) => void;
}

const TabButton = memo(function TabButton({
  groupId,
  id: tabId,
  title,
  icon,
  closable,
  disabled,
  dirty,
  isActive,
  onSelect,
  onKeyDown,
  onClose,
}: TabButtonProps) {
  const tabButtonId = `${groupId}-${tabId}`;
  const tabPanelId = `${groupId}-${tabId}-panel`;

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
        disabled && 'opacity-50'
      )}
    >
      <button
        aria-controls={tabPanelId}
        aria-selected={isActive}
        data-active={isActive}
        disabled={disabled}
        id={tabButtonId}
        data-testid={`tab-${tabId}`}
        onClick={() => onSelect(tabId)}
        onKeyDown={(event) => onKeyDown(event, tabId)}
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
        {icon ? (
          <span aria-hidden="true" className="shrink-0">
            {icon}
          </span>
        ) : null}
        <span className="max-w-44 truncate">{title}</span>

        {dirty ? (
          <span
            data-testid={`tab-dirty-${tabId}`}
            aria-label="Unsaved changes"
            title="Unsaved changes"
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              isActive ? 'bg-primary' : 'bg-amber-500'
            )}
          />
        ) : null}
      </button>

      {closable && onClose ? (
        <button
          data-testid={`tab-close-${tabId}`}
          aria-label={`Close ${title}`}
          onClick={() => onClose(tabId)}
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
  const eventState = useRef({ items, isControlled, onTabSelect });
  // Keep handlers stable across panel updates and read only committed tab state.
  useLayoutEffect(() => {
    eventState.current = { items, isControlled, onTabSelect };
  }, [items, isControlled, onTabSelect]);

  const handleTabSelect = useCallback((tabId: TabId) => {
    const { items, isControlled, onTabSelect } = eventState.current;
    const selectedTab = items.find((tab) => tab.id === tabId);

    if (!selectedTab || selectedTab.disabled) {
      return;
    }

    if (!isControlled) {
      setLocalActiveTabId(tabId);
    }

    onTabSelect?.(tabId);
  }, []);

  const handleTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, tabId: TabId) => {
      const { items } = eventState.current;
      const enabledTabs = getEnabledTabs(items);
      let index = enabledTabs.findIndex((tab) => tab.id === tabId);
      if (index === -1) {
        return;
      }
      if (event.key === 'ArrowRight') {
        index = (index + 1) % enabledTabs.length;
      } else if (event.key === 'ArrowLeft') {
        index = (index + enabledTabs.length - 1) % enabledTabs.length;
      } else if (event.key === 'Home') {
        index = 0;
      } else if (event.key === 'End') {
        index = enabledTabs.length - 1;
      } else {
        return;
      }
      event.preventDefault();
      const nextTab = enabledTabs[index];
      handleTabSelect(nextTab.id);
      document.getElementById(`${id}-${nextTab.id}`)?.focus();
    },
    [handleTabSelect, id]
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
            onKeyDown={handleTabKeyDown}
            id={tab.id}
            title={tab.title}
            icon={tab.icon}
            closable={tab.closable}
            disabled={tab.disabled}
            dirty={tab.dirty}
          />
        ))}
      </div>

      <div className="min-h-0 flex-1 bg-background">
        {items.map((tab) => {
          const isActive = tab.id === activeTab?.id;
          let content: ReactNode = null;
          if (isActive || tab.keepMounted) {
            content = tab.panel;
          }

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
              {content}
            </section>
          );
        })}
      </div>
    </div>
  );
}
