import { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SelectProjectSceneDialog from '../dialogs/SelectProjectSceneDialog';
import { ProjectSceneInfo } from '@/karabo_data/ProjectDbInfo';
import { useNavigate } from 'react-router-dom';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { ProjectSceneCache } from '@/store/ProjectSceneCache';

export type LoadProjectSceneProps = {
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
};

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
    ProjectSceneCache.inst.storeSceneInfo(selectedScene);

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
