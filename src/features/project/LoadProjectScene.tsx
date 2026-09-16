import { Button } from '@/components/api';
import { FolderOpen } from 'lucide-react';
import SelectProjectSceneDialog from './SelectProjectSceneDialog';
import type { LoadProjectSceneProps } from './types/project.types';
import { useLoadProjectScene } from './hooks/useLoadProjectScene';

export default function LoadProjectScene({
  className,
  size = 'sm',
  variant = 'default',
}: LoadProjectSceneProps) {
  const { openDialog, handleOpenDialog, handleCancel, handleSceneSelected } =
    useLoadProjectScene();

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
