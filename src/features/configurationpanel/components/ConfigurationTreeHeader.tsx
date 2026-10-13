import { useEffect, useRef } from 'react';
import { columns, MIN_COLUMN_WIDTH } from '../const';
import { useContentWidth } from '../hooks/useConfigurationColumns';

const RESIZE_STEP = 10;
const HEADER_WIDTH_ID = Symbol('header');

function ColumnResizeHandle({
  name,
  width,
  maxWidth,
  onResize,
}: {
  name: string;
  width: number;
  maxWidth: number;
  onResize: (width: number) => void;
}) {
  const removeDrag = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => removeDrag.current?.(), []);
  return (
    <div
      role="separator"
      aria-label={`Resize ${name} column`}
      aria-orientation="vertical"
      aria-valuemin={MIN_COLUMN_WIDTH}
      aria-valuemax={maxWidth}
      aria-valuenow={Math.round(width)}
      tabIndex={0}
      className="absolute -right-1 top-0 z-10 h-full w-2 cursor-col-resize touch-none hover:bg-primary/30 focus-visible:bg-primary/30"
      onPointerDown={(event) => {
        if (event.button !== 0) {
          return;
        }
        event.preventDefault();
        removeDrag.current?.();
        const startX = event.clientX;
        const move = (event: PointerEvent) =>
          onResize(width + event.clientX - startX);
        const stop = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', stop);
          window.removeEventListener('pointercancel', stop);
          window.removeEventListener('blur', stop);
          removeDrag.current = undefined;
        };
        removeDrag.current = stop;
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
        window.addEventListener('blur', stop);
      }}
      onKeyDown={(event) => {
        let next = width;
        if (event.key === 'ArrowLeft') {
          next -= RESIZE_STEP;
        } else if (event.key === 'ArrowRight') {
          next += RESIZE_STEP;
        } else if (event.key === 'Home') {
          next = MIN_COLUMN_WIDTH;
        } else if (event.key === 'End') {
          next = maxWidth;
        } else {
          return;
        }
        event.preventDefault();
        onResize(next);
      }}
    />
  );
}

export default function ConfigurationTreeHeader({
  widths,
  maxima,
  onResize,
}: {
  widths: [number, number];
  maxima: [number, number];
  onResize: (index: 0 | 1, width: number) => void;
}) {
  const header = useContentWidth(HEADER_WIDTH_ID, 8);
  return (
    <div
      data-configuration-header
      style={columns}
      className="h-[30px] shrink-0 border-y bg-muted text-xs font-medium"
    >
      <span className="relative flex min-w-0 items-center justify-center border-r px-1">
        <div ref={header} className="w-max">
          Property
        </div>
        <ColumnResizeHandle
          name="Property"
          width={widths[0]}
          maxWidth={maxima[0]}
          onResize={(width) => onResize(0, width)}
        />
      </span>
      <span className="relative flex min-w-0 items-center justify-center border-r px-1">
        <span className="truncate" title="Current value on device">
          Current value on device
        </span>
        <ColumnResizeHandle
          name="Current value on device"
          width={widths[1]}
          maxWidth={maxima[1]}
          onResize={(width) => onResize(1, width)}
        />
      </span>
      <span className="flex min-w-0 items-center justify-center border-r px-1">
        Value
      </span>
    </div>
  );
}
