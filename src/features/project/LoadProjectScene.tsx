import { Button } from '@/components/api';
import { FolderOpen } from 'lucide-react';
import SelectProjectSceneDialog from './SelectProjectSceneDialog';
import type { LoadProjectSceneProps } from './types/project.types';
import { useLoadProjectScene } from './hooks/useLoadProjectScene';

export default function LoadProjectScene({
  className,
  iconClassName,
  labelClassName,
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
        <FolderOpen className={iconClassName ?? 'size-4'} />
        <span className={labelClassName}>Load Project Scene</span>
      </Button>

      <SelectProjectSceneDialog
        open={openDialog}
        onSceneSelected={handleSceneSelected}
        onCancel={handleCancel}
      />
    </>
  );
}
