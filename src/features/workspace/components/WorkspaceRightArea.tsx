import { memo, useEffect, useRef, type ReactNode } from 'react';
import { Tabs, type TabItem } from '@/components/api';
import { KaraboEvent, useKaraboEvent } from '@/lib/events';
import usePanelArea from '../hooks/usePanelArea';
import { ConfigurationPanel } from '@/features/configurationpanel/api';
import { CONFIGURATION_TAB_ID, CONTROLLERS_TAB_ID } from '../utils';
import ControllerPanelStack from './ControllerPanelStack';

interface WorkspaceRightAreaProps {
  isVisible: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

function WorkspaceRightArea({
  isVisible,
  onExpandedChange,
}: WorkspaceRightAreaProps) {
  const { area: right, onTabSelect } = usePanelArea('right');
  const controllersActive = right.activeTabId === CONTROLLERS_TAB_ID;
  const panels = right.controllerPanels;
  const previousPanelCount = useRef(0);

  useEffect(() => {
    if (
      previousPanelCount.current === 0 &&
      panels.length > 0 &&
      controllersActive
    ) {
      onExpandedChange(true);
    }
    if (
      previousPanelCount.current > 0 &&
      panels.length === 0 &&
      controllersActive
    ) {
      onExpandedChange(false);
    }
    previousPanelCount.current = panels.length;
  }, [controllersActive, panels.length, onExpandedChange]);

  useKaraboEvent(KaraboEvent.ControllerPanelActivated, () => {
    onExpandedChange(true);
  });

  useKaraboEvent(KaraboEvent.ShowConfiguration, () => {
    onTabSelect(CONFIGURATION_TAB_ID);
    onExpandedChange(true);
  });

  const items: TabItem[] = right.tabs.map((tab) => {
    const isControllersTab = tab.id === CONTROLLERS_TAB_ID;
    const isConfigurationTab = tab.id === CONFIGURATION_TAB_ID;
    let content: ReactNode = null;
    if (isControllersTab) {
      content = (
        <ControllerPanelStack
          panels={panels}
          isVisible={isVisible && controllersActive}
        />
      );
    }
    if (isConfigurationTab) {
      content = <ConfigurationPanel />;
    }
    return {
      ...tab,
      panel: content,
      keepMounted: isControllersTab || isConfigurationTab,
    };
  });

  return (
    <section className="h-full min-h-0 overflow-hidden border bg-background">
      <Tabs
        id="workspace-right-tabs"
        ariaLabel="Right area"
        items={items}
        activeTabId={right.activeTabId}
        onTabSelect={onTabSelect}
        panelClassName="overflow-hidden"
      />
    </section>
  );
}

export default memo(WorkspaceRightArea);
