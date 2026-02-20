import { Button } from '@/components/button';
import { ProjectSceneInfo } from '@/lib/ProjectDbInfo';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SelectProjectSceneDialog from './SelectProjectSceneDialog';
import type { LoadProjectSceneProps } from './types/project.types';

export default function LoadProjectScene({
  className,
  size = 'sm',
  variant = 'default',
}: LoadProjectSceneProps) {
  const navigate = useNavigate();
  const { sessionInfo } = useGlobalStore();
  const [openDialog, setOpenDialog] = useState(false);

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCancel = () => {
    setOpenDialog(false);
  };

  const handleSceneSelected = (selectedScene: ProjectSceneInfo) => {
    setOpenDialog(false);

    if (!sessionInfo) return;

    navigate(
      `/scene?host=${sessionInfo.guiServerHost}&port=${
        sessionInfo.guiServerPort
      }&domain=${encodeURIComponent(
        selectedScene.domain
      )}&projectName=${encodeURIComponent(
        selectedScene.projectName
      )}&uuid=${encodeURIComponent(selectedScene.uuid)}`
    );
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
