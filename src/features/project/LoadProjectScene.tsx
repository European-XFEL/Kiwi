import { Button } from '@/components/api';
import { FolderOpen } from 'lucide-react';
import { useState } from 'react';
import SelectProjectSceneDialog from './SelectProjectSceneDialog';
import type { LoadProjectSceneProps } from './types/project.types';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { ProjectModel } from '@/karabo/common/project/api';
import { showMessageBox } from '@/lib/messagebox';
import { openSceneInWorkspace } from './utils/openSceneInWorkspace';
import { getProjectModel } from '@/lib/singletons/api';
import { findSceneModelInCurrentProject } from './utils/openSceneLinkInWorkspace';
import { loadProjectSceneModel } from './utils/loadProjectSceneModel';

export default function LoadProjectScene({
  className,
  size = 'sm',
  variant = 'default',
}: LoadProjectSceneProps) {
  const [openDialog, setOpenDialog] = useState(false);

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCancel = () => {
    setOpenDialog(false);
  };

  const handleSceneSelected = (
    domain: string,
    project: ProjectModel,
    selectedScene: SceneModel
  ) => {
    setOpenDialog(false);

    if (
      getProjectModel().root &&
      getProjectModel().root!.uuid === project.uuid
    ) {
      // The selected scene belongs to the current root project - can be
      // opened directly as it is already in the ProjectModel
      let rootProject = getProjectModel().root!;

      // As the selectedScene returned by the dialog is a partially filled object -
      // only has uuid, simple_name and date - the full scene model has to be
      // retrieved from the current root project
      let model = findSceneModelInCurrentProject(selectedScene.uuid);
      if (model) {
        openSceneInWorkspace({
          model: model,
        });
      } else {
        console.error(
          `Scene ${selectedScene.simple_name} (${selectedScene.uuid}) not found in root project, ${domain}:${rootProject.simple_name}!`
        );
      }
    } else {
      void loadProjectSceneModel({
        domain,
        projectUuid: project.uuid,
        sceneUuid: selectedScene.uuid,
      })
        .then((scene) => {
          openSceneInWorkspace({ model: scene });
        })
        .catch((error) => {
          showMessageBox({
            variant: 'error',
            title: 'Could not open scene',
            msg:
              error instanceof Error
                ? error.message
                : 'The scene could not be loaded.',
          });
        });
    }
  };

  return (
    <>
      <Button
        size={size}
        variant={variant}
        onClick={handleOpenDialog}
        className={className}
      >
        <FolderOpen className="h-4 w-4 mr-2" />
        Load Project Scene
      </Button>

      <SelectProjectSceneDialog
        open={openDialog}
        onSceneSelected={handleSceneSelected}
        onCancel={handleCancel}
      />
    </>
  );
}
