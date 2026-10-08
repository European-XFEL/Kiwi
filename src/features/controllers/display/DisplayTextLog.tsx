import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/api';
import { DisplayTextLogModel } from '@/karabo/common/api';
import { getBindingValue } from '../utils/getBindingValue';
import type { ControllerContainerContext } from '@/features/scene-view/api';
import icons from '@/assets/icons';
import { Timestamp } from '@/karabo/data';
import { ALL_OK_COLOR } from '@/lib/colors';

function formatTimestamp(timestamp?: Timestamp): string {
  return timestamp?.toLocal('T', 'seconds').slice(11, 19) ?? 'undefined';
}

const DisplayTextLog: React.FC<{
  model: DisplayTextLogModel;
  ctx?: ControllerContainerContext;
}> = ({ ctx }) => {
  const backgroundColor = ALL_OK_COLOR;
  const logRef = React.useRef<HTMLDivElement>(null);
  const proxy = ctx?.proxy;
  const currentValue = getBindingValue(proxy) as string | undefined;
  const currentTimestamp = proxy?.binding?.timestamp;
  const timestampRef = React.useRef<Timestamp | undefined>(currentTimestamp);
  const lastValueRef = React.useRef<string | undefined>(currentValue);
  const [selectedText, setSelectedText] = React.useState('');
  const [textLog, setTextLog] = React.useState(() =>
    currentValue === undefined
      ? ''
      : currentTimestamp
        ? `[${formatTimestamp(currentTimestamp)}]: ${currentValue}`
        : currentValue
  );

  React.useEffect(() => {
    if (currentValue === undefined) {
      setTextLog('');
      timestampRef.current = undefined;
      lastValueRef.current = undefined;
      return;
    }

    if (lastValueRef.current === undefined) {
      setTextLog(`[${formatTimestamp(currentTimestamp)}]: ${currentValue}`);
      timestampRef.current = currentTimestamp;
      lastValueRef.current = currentValue;
      return;
    }

    const sameTimestamp =
      currentTimestamp !== undefined &&
      timestampRef.current?.equals(currentTimestamp);
    const sameValue = lastValueRef.current === currentValue;
    if (sameTimestamp && sameValue) return;
    if (currentTimestamp === undefined && sameValue) return;

    const timestamp = currentTimestamp ?? new Timestamp();
    const formattedTimestamp = formatTimestamp(timestamp);
    setTextLog(
      (currentText) =>
        `${currentText}${currentText ? '\n' : ''}[${formattedTimestamp}]: ${currentValue}`
    );
    timestampRef.current = currentTimestamp;
    lastValueRef.current = currentValue;
  }, [currentValue, currentTimestamp]);

  React.useLayoutEffect(() => {
    const log = logRef.current;
    if (!log) return;
    log.scrollTop = log.scrollHeight;
  }, [textLog]);

  const rememberSelection = () => {
    const log = logRef.current;
    const selection = window.getSelection();
    setSelectedText(
      selection &&
        log?.contains(selection.anchorNode) &&
        log.contains(selection.focusNode)
        ? selection.toString()
        : ''
    );
  };

  const selectAll = () => {
    const log = logRef.current;
    const selection = window.getSelection();
    if (!log || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(log);
    selection.removeAllRanges();
    selection.addRange(range);
    rememberSelection();
  };

  const copySelected = () => {
    if (!selectedText || !navigator.clipboard) return;
    void navigator.clipboard.writeText(selectedText).catch(() => undefined);
  };

  const clearTextLog = () => setTextLog('');

  return (
    <div className="flex h-full w-full min-h-0 flex-col">
      <ContextMenu onOpenChange={(open) => open && rememberSelection()}>
        <ContextMenuTrigger asChild>
          <div
            ref={logRef}
            data-testid="display-text-log"
            role="region"
            aria-label="Text log"
            tabIndex={0}
            className="min-h-0 w-full flex-1 overflow-auto rounded border bg-canvas p-1 font-mono text-xs leading-4 whitespace-pre-wrap break-words"
            style={{ backgroundColor }}
          >
            {textLog}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            logRef.current?.focus({ preventScroll: true });
          }}
        >
          <ContextMenuItem disabled={textLog.length === 0} onSelect={selectAll}>
            Select All
          </ContextMenuItem>
          <ContextMenuItem
            disabled={selectedText.length === 0}
            onSelect={copySelected}
          >
            Copy Selected
          </ContextMenuItem>
          <ContextMenuItem
            disabled={textLog.length === 0}
            onSelect={clearTextLog}
          >
            Clear text log
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <div className="flex justify-end pt-0.5">
        <button
          type="button"
          aria-label="Clear text log"
          title="Clear text log"
          onClick={clearTextLog}
          className="rounded p-0.5 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
        >
          <img src={icons.editClear} alt="" className="size-4" />
        </button>
      </div>
    </div>
  );
};

export default DisplayTextLog;
