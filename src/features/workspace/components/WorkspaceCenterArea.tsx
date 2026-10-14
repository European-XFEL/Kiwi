import { memo, useRef } from 'react';
import { useFullscreen, type ScenePanelProps } from '@/features/scenepanel/api';
import { HOME_TAB_ID } from '@/lib/singletons/PanelWrangler';
import { CINEMA_TAB_ID } from '@/features/cinema/api';
import HomePanel from '@/app/HomePanel';
import type { PanelTab } from '../types';
import PanelContainer from './PanelContainer';
import SceneTabPanel from './SceneTabPanel';

function renderCenterPanel({
  tab,
  isVisible,
  showProjectNavigation,
  fullscreen,
}: {
  tab: PanelTab;
  isVisible: boolean;
  showProjectNavigation: boolean;
  fullscreen: Pick<ScenePanelProps, 'isFullscreen' | 'onToggleFullscreen'>;
}) {
  if (tab.id === CINEMA_TAB_ID) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No scene open
      </div>
    );
  }
  if (tab.id === HOME_TAB_ID) {
    return <HomePanel />;
  }
  if (!isVisible) {
    return null;
  }

  return (
    <SceneTabPanel
      {...fullscreen}
      tabId={tab.id}
      showProjectNavigation={showProjectNavigation}
    />
  );
}

function WorkspaceCenterArea({
  isVisible,
  showProjectNavigation = true,
}: {
  isVisible: boolean;
  showProjectNavigation?: boolean;
}) {
  const containerRef = useRef<HTMLElement | null>(null);
  const { isFullscreen, supported, toggle } = useFullscreen(containerRef);

  return (
    <PanelContainer
      area="center"
      containerRef={containerRef}
      renderPanel={(tab) =>
        renderCenterPanel({
          tab,
          isVisible,
          showProjectNavigation,
          fullscreen: {
            isFullscreen,
            onToggleFullscreen: supported ? toggle : undefined,
          },
        })
      }
      // The scene viewport owns its overflow and spacing.
      panelClassName="overflow-hidden"
      emptyState={
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium">No scene open</p>
          <p className="text-xs text-muted-foreground">
            Open a scene to start working.
          </p>
        </div>
      }
    />
  );
}

export default memo(WorkspaceCenterArea);
