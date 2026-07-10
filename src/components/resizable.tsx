import {
  Group,
  Panel,
  Separator,
  type GroupProps,
  type PanelProps,
  type SeparatorProps,
  type GroupImperativeHandle,
} from 'react-resizable-panels';
import { cn } from './utils/cn';

function ResizablePanelGroup({ className, ...props }: GroupProps) {
  return (
    <Group
      data-slot="resizable-panel-group"
      className={cn(
        'flex h-full min-h-0 w-full min-w-0 overflow-hidden',
        'aria-[orientation=vertical]:flex-col',
        className
      )}
      {...props}
    />
  );
}

function ResizablePanel({ className, ...props }: PanelProps) {
  return (
    <Panel
      data-slot="resizable-panel"
      className={cn('min-h-0 min-w-0 overflow-hidden', className)}
      {...props}
    />
  );
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: SeparatorProps & {
  withHandle?: boolean;
}) {
  return (
    <Separator
      data-slot="resizable-handle"
      className={cn(
        // The lane is a visible gutter (tinted, 8px) rather than a transparent
        // sliver so users can tell the panels are resizable even while the
        // side panels start collapsed and the center is otherwise full-bleed.
        'group relative z-10 flex shrink-0 items-center justify-center bg-muted/70 transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/70',

        /**
         * The separator orientation describes the visual separator:
         * vertical   = between left/right panels
         * horizontal = between top/bottom panels
         */
        'aria-[orientation=vertical]:h-full aria-[orientation=vertical]:w-2 aria-[orientation=vertical]:cursor-col-resize',
        'aria-[orientation=horizontal]:h-2 aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:cursor-row-resize',

        /**
         * Invisible hit target.
         * This makes the handle easier to grab without making the UI look bulky.
         */
        'after:absolute after:content-[""]',
        'aria-[orientation=vertical]:after:inset-y-0 aria-[orientation=vertical]:after:left-1/2 aria-[orientation=vertical]:after:w-4 aria-[orientation=vertical]:after:-translate-x-1/2',
        'aria-[orientation=horizontal]:after:inset-x-0 aria-[orientation=horizontal]:after:top-1/2 aria-[orientation=horizontal]:after:h-4 aria-[orientation=horizontal]:after:-translate-y-1/2',

        /**
         * Visible separator line.
         */
        'before:absolute before:bg-border before:content-[""] before:transition-colors',
        'aria-[orientation=vertical]:before:inset-y-0 aria-[orientation=vertical]:before:left-1/2 aria-[orientation=vertical]:before:w-px aria-[orientation=vertical]:before:-translate-x-1/2',
        'aria-[orientation=horizontal]:before:inset-x-0 aria-[orientation=horizontal]:before:top-1/2 aria-[orientation=horizontal]:before:h-px aria-[orientation=horizontal]:before:-translate-y-1/2',

        /**
         * Active / hover state.
         */
        'hover:before:bg-ring/50',
        'data-resize-handle-active:before:bg-ring/70',

        /**
         * Handle pill orientation.
         */
        '[&[aria-orientation=vertical]>div]:h-10 [&[aria-orientation=vertical]>div]:w-3',
        '[&[aria-orientation=horizontal]>div]:h-3 [&[aria-orientation=horizontal]>div]:w-10',
        '[&[aria-orientation=horizontal]>div>div]:rotate-90',

        className
      )}
      {...props}
    >
      {withHandle ? (
        <div
          className={cn(
            'pointer-events-none z-10 flex items-center justify-center rounded-full border border-border/80 bg-background/95 shadow-sm backdrop-blur-sm',
            // Rest-visible so the resize affordance is discoverable without
            // hovering; hover/drag brings it to full strength.
            'opacity-70 transition-opacity duration-150',
            'group-hover:opacity-100 group-focus-visible:opacity-100',
            'group-data-resize-handle-active:opacity-100'
          )}
        >
          <div className="flex h-4 w-2 flex-col items-center justify-between text-muted-foreground/80">
            <span className="h-0.5 w-full rounded-full bg-current" />
            <span className="h-0.5 w-full rounded-full bg-current" />
            <span className="h-0.5 w-full rounded-full bg-current" />
          </div>
        </div>
      ) : null}
    </Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
export { useDefaultLayout } from 'react-resizable-panels';
export type { GroupImperativeHandle as ImperativePanelGroupHandle };
