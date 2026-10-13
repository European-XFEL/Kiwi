import PanelContainer from './PanelContainer';
import { SystemTopologyPanel } from '@/features/topologypanel/api';
import { SYSTEM_TOPOLOGY_TAB_ID } from '../utils';

export default function WorkspaceLeftArea() {
  return (
    <PanelContainer
      area="left"
      renderPanel={(tab) => {
        if (tab.id === SYSTEM_TOPOLOGY_TAB_ID) {
          return <SystemTopologyPanel />;
        }
        return null;
      }}
    />
  );
}
