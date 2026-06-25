import { Button } from '@/components/api';
import { FolderOpen } from 'lucide-react';
import { useState } from 'react';
import SelectProjectSceneDialog from './SelectProjectSceneDialog';
import type { LoadProjectSceneProps } from './types/project.types';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { openSceneInWorkspace } from './utils/openSceneInWorkspace';

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
    projectName: string,
    selectedScene: SceneModel
  ) => {
    setOpenDialog(false);

    openSceneInWorkspace({
      domain,
      projectName,
      uuid: selectedScene.uuid,
      name: selectedScene.simple_name,
    });
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
