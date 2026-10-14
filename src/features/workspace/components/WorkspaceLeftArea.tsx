import PanelContainer from './PanelContainer';
import { SystemTopologyPanel } from '@/features/topologypanel/api';
import { ProjectPanel, PROJECTS_TAB_ID } from '@/features/projectpanel/api';
import { SYSTEM_TOPOLOGY_TAB_ID } from '../utils';
import type { PanelTab } from '../types';

function renderLeftPanel(tab: PanelTab) {
  if (tab.id === SYSTEM_TOPOLOGY_TAB_ID) {
    return <SystemTopologyPanel />;
  }
  if (tab.id === PROJECTS_TAB_ID) {
    return <ProjectPanel />;
  }
  return null;
}

export default function WorkspaceLeftArea() {
  return <PanelContainer area="left" renderPanel={renderLeftPanel} />;
}
