import { cn } from '@/components/api';
import { X } from 'lucide-react';
import type { TabButtonViewProps } from '../types';

export default function TabButton({
  groupId,
  tab,
  isActive,
  onTabSelect,
  onTabClose,
  onTabContextMenu,
}: TabButtonViewProps) {
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
        onClick={() => onTabSelect(groupId, tab.id)}
        onContextMenu={(event) => {
          onTabContextMenu?.(groupId, tab.id, event);
        }}
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

      {tab.closable && onTabClose ? (
        <button
          aria-label={`Close ${tab.title}`}
          onClick={(event) => {
            event.stopPropagation();
            onTabClose(groupId, tab.id);
          }}
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
}
