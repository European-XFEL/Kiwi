import { useState } from 'react';
import type { ProjectModel } from '@/karabo/common/project/api';
import type { SceneModel } from '@/karabo/common/scenemodel/api';
import { loadRootProjectFromDialogSelection } from '../utils/rootProjectActions';

export function useLoadProjectScene() {
  const [openDialog, setOpenDialog] = useState(false);

  const handleSceneSelected = (
    domain: string,
    project: ProjectModel,
    scene: SceneModel
  ) => {
    setOpenDialog(false);
    // The loading action reports errors; this event handler consumes its rejection.
    void loadRootProjectFromDialogSelection(
      domain,
      project,
      scene
    ).promise.catch(() => {});
  };

  return {
    openDialog,
    handleOpenDialog: () => setOpenDialog(true),
    handleCancel: () => setOpenDialog(false),
    handleSceneSelected,
  };
}
