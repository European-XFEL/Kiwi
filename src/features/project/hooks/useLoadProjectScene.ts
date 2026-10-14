import { getPanelWrangler } from '@/lib/singletons/api';
import { useState } from 'react';
import type { ProjectModel } from '@/karabo/common/project/api';
import { loadRootProject } from '../utils/rootProjectActions';

export function useLoadProjectScene() {
  const [openDialog, setOpenDialog] = useState(false);

  const handleProjectSelected = (domain: string, project: ProjectModel) => {
    setOpenDialog(false);
    // The loading action reports errors; this handler consumes its rejection.
    void loadRootProject({ domain, projectUuid: project.uuid })
      .promise.then(() => getPanelWrangler().showProjects())
      .catch(() => {});
  };

  return {
    openDialog,
    handleOpenDialog: () => setOpenDialog(true),
    handleCancel: () => setOpenDialog(false),
    handleProjectSelected,
  };
}
