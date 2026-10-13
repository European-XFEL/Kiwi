import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { GroupImperativeHandle, Layout } from 'react-resizable-panels';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import WorkspaceRightArea from './WorkspaceRightArea';
import WorkspaceLeftArea from './WorkspaceLeftArea';
import WorkspaceCenterArea from './WorkspaceCenterArea';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/api';
import type { WorkspaceBodyModel, PanelModel } from '../types';
import { WORKSPACE_PANEL_IDS } from '../utils';

const [leftPanelId, centerPanelId, rightPanelId] = WORKSPACE_PANEL_IDS;
const sidePanelIds = { left: leftPanelId, right: rightPanelId };

interface WorkspaceBodyProps {
  body: WorkspaceBodyModel;
  isPageVisible?: boolean;
}

function toSize(value: number | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return `${value}%`;
}

function getStartingWidth(panel: PanelModel): number {
  if (panel.collapsed) {
    return panel.collapsedWidthPercent;
  }
  return panel.defaultWidthPercent;
}

function WorkspaceBody({ body, isPageVisible = true }: WorkspaceBodyProps) {
  const { panelArea } = body;

  const groupRef = useRef<GroupImperativeHandle | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftSeparatorRef = useRef<HTMLDivElement>(null);
  const rightSeparatorRef = useRef<HTMLDivElement>(null);
  const lastWidths = useRef({
    left: panelArea.left.lastExpandedWidthPercent || 24,
    right: panelArea.right.lastExpandedWidthPercent || 35,
  });
  const [layout, setLayout] = useState<Layout>(() => ({
    [leftPanelId]: getStartingWidth(panelArea.left),
    [centerPanelId]: getStartingWidth(panelArea.center),
    [rightPanelId]: getStartingWidth(panelArea.right),
  }));
  const [anchors, setAnchors] = useState({
    left: { left: 0, top: 0 },
    right: { left: 0, top: 0 },
  });

  const updateAnchors = useCallback(() => {
    const container = containerRef.current?.getBoundingClientRect();
    if (!container) {
      return;
    }
    const anchor = (element: HTMLDivElement | null) => {
      const rect = element?.getBoundingClientRect();
      if (rect) {
        return {
          left: rect.left + rect.width / 2 - container.left,
          top: rect.top + rect.height / 2 - container.top,
        };
      }
      return { left: 0, top: 0 };
    };
    setAnchors({
      left: anchor(leftSeparatorRef.current),
      right: anchor(rightSeparatorRef.current),
    });
  }, []);

  const recordLayout = useCallback((next: Layout) => {
    for (const side of ['left', 'right'] as const) {
      const id = sidePanelIds[side];
      if (next[id] > 0) {
        lastWidths.current[side] = next[id];
      }
    }
    setLayout(next);
  }, []);

  const setSideExpanded = useCallback(
    (side: 'left' | 'right', expanded: boolean) => {
      const group = groupRef.current;
      if (!group) {
        return;
      }
      const current = group.getLayout();
      const id = sidePanelIds[side];
      if (expanded === current[id] > 0) {
        return;
      }
      const panel = panelArea[side];
      const available = current[id] + current[centerPanelId];
      let width = 0;
      if (expanded) {
        const minimum = Math.max(
          panel.minWidthPercent,
          available - (panelArea.center.maxWidthPercent ?? 100)
        );
        const maximum = Math.min(
          panel.maxWidthPercent ?? 100,
          available - panelArea.center.minWidthPercent
        );
        if (maximum < minimum) {
          return;
        }
        width = Math.max(minimum, Math.min(lastWidths.current[side], maximum));
      } else {
        if (available > (panelArea.center.maxWidthPercent ?? 100)) {
          return;
        }
        lastWidths.current[side] = current[id];
      }
      recordLayout(
        group.setLayout({
          ...current,
          [id]: width,
          [centerPanelId]: available - width,
        })
      );
    },
    [panelArea, recordLayout]
  );

  const setRightExpanded = useCallback(
    (expanded: boolean) => setSideExpanded('right', expanded),
    [setSideExpanded]
  );

  useLayoutEffect(updateAnchors, [layout, updateAnchors]);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(updateAnchors);
    for (const element of [
      containerRef.current,
      leftSeparatorRef.current,
      rightSeparatorRef.current,
    ]) {
      if (element) {
        observer.observe(element);
      }
    }
    window.addEventListener('resize', updateAnchors);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateAnchors);
    };
  }, [updateAnchors]);

  return (
    <div ref={containerRef} className="relative h-full min-h-0 w-full">
      <ResizablePanelGroup
        groupRef={groupRef}
        onLayoutChange={recordLayout}
        orientation={panelArea.orientation}
        className="h-full min-h-0 w-full"
      >
        <ResizablePanel
          id={leftPanelId}
          defaultSize={toSize(getStartingWidth(panelArea.left))}
          minSize={toSize(panelArea.left.minWidthPercent)}
          maxSize={toSize(panelArea.left.maxWidthPercent)}
          collapsible={panelArea.left.collapsible}
          collapsedSize={toSize(panelArea.left.collapsedWidthPercent)}
          className="min-h-0 overflow-hidden"
        >
          <WorkspaceLeftArea />
        </ResizablePanel>

        <ResizableHandle elementRef={leftSeparatorRef} />

        <ResizablePanel
          id={centerPanelId}
          defaultSize={toSize(getStartingWidth(panelArea.center))}
          minSize={toSize(panelArea.center.minWidthPercent)}
          maxSize={toSize(panelArea.center.maxWidthPercent)}
          collapsible={panelArea.center.collapsible}
          collapsedSize={toSize(panelArea.center.collapsedWidthPercent)}
          className="min-h-0 overflow-hidden"
        >
          <WorkspaceCenterArea isVisible={isPageVisible} />
        </ResizablePanel>

        <ResizableHandle elementRef={rightSeparatorRef} />

        <ResizablePanel
          id={rightPanelId}
          defaultSize={toSize(getStartingWidth(panelArea.right))}
          minSize={toSize(panelArea.right.minWidthPercent)}
          maxSize={toSize(panelArea.right.maxWidthPercent)}
          collapsible={panelArea.right.collapsible}
          collapsedSize={toSize(panelArea.right.collapsedWidthPercent)}
          className="min-h-0 overflow-hidden"
        >
          <WorkspaceRightArea
            isVisible={isPageVisible && layout[rightPanelId] > 0}
            onExpandedChange={setRightExpanded}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
      {(['left', 'right'] as const).map((side) => {
        const id = sidePanelIds[side];
        const expanded = layout[id] > 0;
        let Icon = ChevronRight;
        if ((side === 'left') === expanded) {
          Icon = ChevronLeft;
        }
        let action = 'Unfold';
        if (expanded) {
          action = 'Fold';
        }
        return (
          <button
            key={side}
            type="button"
            aria-label={`${action} ${side} panel`}
            aria-expanded={expanded}
            aria-controls={id}
            className="absolute z-20 flex h-10 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded border bg-background shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={anchors[side]}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setSideExpanded(side, !expanded);
            }}
          >
            <Icon aria-hidden="true" className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

export default memo(WorkspaceBody);
