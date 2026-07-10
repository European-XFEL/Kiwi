import type { ReactNode } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  useDefaultLayout,
} from '@/components/api';
import type { PanelTab, WorkspaceBodyModel, PanelModel } from '../types';
import PanelContainer from './PanelContainer';

const PANEL_IDS = ['workspace-left', 'workspace-center', 'workspace-right'];

interface WorkspaceBodyProps {
  body: WorkspaceBodyModel;
  renderLeftPanel: (tab: PanelTab) => ReactNode;
  renderCenterPanel: (tab: PanelTab) => ReactNode;
  renderRightPanel: (tab: PanelTab) => ReactNode;
  leftEmptyState?: ReactNode;
  centerEmptyState?: ReactNode;
  rightEmptyState?: ReactNode;
  centerPanelClassName?: string;
}

function toSize(value: number | undefined): number | undefined {
  return value;
}

function getStartingWidth(panel: PanelModel): number {
  return panel.collapsed
    ? panel.collapsedWidthPercent
    : panel.defaultWidthPercent;
}

export default function WorkspaceBody({
  body,
  renderLeftPanel,
  renderCenterPanel,
  renderRightPanel,
  leftEmptyState,
  centerEmptyState,
  rightEmptyState,
  centerPanelClassName,
}: WorkspaceBodyProps) {
  const { panelArea } = body;

  // Persist dragged panel widths across page reloads. On first run nothing is
  // stored, so the per-panel defaultSize startup rule (sides collapsed, scene
  // owns the space) still applies. A scene reload then only repaints the
  // center panel instead of snapping all three back to their defaults.
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: panelArea.id,
    panelIds: PANEL_IDS,
    storage: localStorage,
  });

  return (
    <ResizablePanelGroup
      orientation={panelArea.orientation}
      className="h-full min-h-0 w-full"
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
    >
      <ResizablePanel
        id="workspace-left"
        defaultSize={getStartingWidth(panelArea.left)}
        minSize={toSize(panelArea.left.minWidthPercent)}
        maxSize={toSize(panelArea.left.maxWidthPercent)}
        collapsible={panelArea.left.collapsible}
        collapsedSize={toSize(panelArea.left.collapsedWidthPercent)}
        className="min-h-0 overflow-hidden"
      >
        <PanelContainer
          area="left"
          renderPanel={renderLeftPanel}
          emptyState={leftEmptyState}
        />
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel
        id="workspace-center"
        defaultSize={getStartingWidth(panelArea.center)}
        minSize={toSize(panelArea.center.minWidthPercent)}
        maxSize={toSize(panelArea.center.maxWidthPercent)}
        collapsible={panelArea.center.collapsible}
        collapsedSize={toSize(panelArea.center.collapsedWidthPercent)}
        className="min-h-0 overflow-hidden"
      >
        <PanelContainer
          area="center"
          renderPanel={renderCenterPanel}
          emptyState={centerEmptyState}
          panelClassName={centerPanelClassName}
        />
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel
        id="workspace-right"
        defaultSize={getStartingWidth(panelArea.right)}
        minSize={toSize(panelArea.right.minWidthPercent)}
        maxSize={toSize(panelArea.right.maxWidthPercent)}
        collapsible={panelArea.right.collapsible}
        collapsedSize={toSize(panelArea.right.collapsedWidthPercent)}
        className="min-h-0 overflow-hidden"
      >
        <PanelContainer
          area="right"
          renderPanel={renderRightPanel}
          emptyState={rightEmptyState}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
