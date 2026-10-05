import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/api';
import { toast } from 'sonner';
import icons from '@/assets/icons';
import { getLogger } from '@/lib/singletons/api';
import type { LogLevel } from '@/lib/singletons/Logger';

const levelClasses: Record<LogLevel, string> = {
  debug: 'text-canvas-foreground/70',
  info: 'text-canvas-foreground',
  warn: 'text-amber-700',
  error: 'text-red-700',
};

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export default function WorkspaceLog() {
  const logger = getLogger();
  const entries = useSyncExternalStore(logger.subscribe, logger.getSnapshot);
  const [expanded, setExpanded] = useState(true);
  const panelId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const anchor = useRef<{ id: string; offset: number } | null>(null);
  const selectedText = useRef('');

  const selectAll = () => {
    const panel = scrollRef.current;
    const selection = window.getSelection();
    if (!panel || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(panel);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const copyToClipboard = async () => {
    const text =
      selectedText.current ||
      entries
        .map(
          (entry) =>
            `${formatTimestamp(entry.timestamp)} - ${entry.level.toUpperCase()} - ${entry.message}`
        )
        .join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      toast.error('Could not copy log to clipboard.');
    }
  };

  const rememberPosition = () => {
    const panel = scrollRef.current;
    if (!panel) return;
    followLatest.current =
      panel.scrollHeight - panel.scrollTop - panel.clientHeight <= 1;
    const row = Array.from(panel.children).find(
      (child) =>
        (child as HTMLElement).offsetTop + (child as HTMLElement).offsetHeight >
        panel.scrollTop
    ) as HTMLElement | undefined;
    anchor.current = row
      ? { id: row.dataset.logId!, offset: row.offsetTop - panel.scrollTop }
      : null;
  };

  useLayoutEffect(() => {
    const panel = scrollRef.current;
    if (!panel || !expanded) return;
    if (followLatest.current) {
      panel.scrollTop = panel.scrollHeight;
    } else if (anchor.current) {
      const row = Array.from(panel.children).find(
        (child) => (child as HTMLElement).dataset.logId === anchor.current!.id
      ) as HTMLElement | undefined;
      panel.scrollTop = row ? row.offsetTop - anchor.current.offset : 0;
    }
    rememberPosition();
  }, [entries, expanded]);

  return (
    <div className="min-w-0 px-4 pt-1 bg-muted shadow-lg">
      <button
        type="button"
        className="flex items-center gap-1 rounded text-xs text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => {
          followLatest.current = true;
          setExpanded((value) => !value);
        }}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Application log
      </button>
      <div id={panelId} hidden={!expanded}>
        <ContextMenu
          onOpenChange={(open) => {
            if (!open) return;
            const selection = window.getSelection();
            const panel = scrollRef.current;
            selectedText.current =
              selection &&
              panel?.contains(selection.anchorNode) &&
              panel.contains(selection.focusNode)
                ? selection.toString()
                : '';
          }}
        >
          <ContextMenuTrigger asChild>
            <div
              ref={scrollRef}
              role="region"
              aria-label="Application log entries"
              tabIndex={0}
              onScroll={rememberPosition}
              className="relative mt-1 h-20 overflow-auto rounded border bg-canvas p-1 font-mono text-xs leading-4"
            >
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  data-log-id={entry.id}
                  className={`whitespace-pre-wrap break-words ${levelClasses[entry.level]}`}
                >
                  {`${formatTimestamp(entry.timestamp)} - ${entry.level.toUpperCase()} - ${entry.message}`}
                </div>
              ))}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              scrollRef.current?.focus({ preventScroll: true });
            }}
          >
            <ContextMenuItem
              disabled={entries.length === 0}
              onSelect={selectAll}
            >
              Select all
            </ContextMenuItem>
            <ContextMenuItem
              disabled={entries.length === 0}
              onSelect={() => void copyToClipboard()}
            >
              Copy to clipboard
            </ContextMenuItem>
            <ContextMenuItem
              disabled={entries.length === 0}
              onSelect={logger.clear}
            >
              Clear Output
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        <div className="flex justify-end pt-0.5">
          <button
            type="button"
            aria-label="Clear log"
            title="Clear log"
            onClick={logger.clear}
            className="rounded p-0.5 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          >
            <img src={icons.editClear} alt="" className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
